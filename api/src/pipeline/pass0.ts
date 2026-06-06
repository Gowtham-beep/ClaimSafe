import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { query } from '../db/client';
import { getLLMProvider, LLMMessage } from '../providers';
import { config } from '../config';

const logger = pino({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export interface Pass0Result {
  policy_type: 'health' | 'term_life' | 'vehicle';
  insurer: string;
  detected_sections: string[];
  extraction_schema: Record<string, string[]>;
}

export async function runPass0(
  jobId: string,
  policyId: string,
  requestId: string
): Promise<Pass0Result & { chunking_strategy: string }> {
  const log = logger.child({ request_id: requestId, job_id: jobId, policy_id: policyId });
  log.info('Pass 0 start');

  try {
    // 1. Fetch raw_pdf_path from policies table
    const policyRes = await query(
      'SELECT raw_pdf_path FROM policies WHERE policy_id = $1',
      [policyId]
    );
    const rawPdfPath = policyRes.rows[0]?.raw_pdf_path;
    if (!rawPdfPath) {
      throw new Error(`No raw_pdf_path found for policy_id: ${policyId}`);
    }

    // 2. Read the PDF file from storage
    const physicalPath = path.join(config.localStoragePath, path.basename(rawPdfPath));
    if (!fs.existsSync(physicalPath)) {
      throw new Error(`PDF file not found at local storage path: ${physicalPath}`);
    }
    const pdfBuffer = await fs.promises.readFile(physicalPath);

    // 3. Send PDF to pdf-service POST /extract
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, path.basename(rawPdfPath));
    formData.append('request_id', requestId);

    const pdfServiceUrl = `${config.pdfServiceUrl}/extract`;
    const response = await fetch(pdfServiceUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'No detail');
      throw new Error(`pdf-service extract failed with status ${response.status}: ${errText}`);
    }

    const extractData = (await response.json()) as {
      chunking_strategy: string;
      chunks: Array<{ chunk_index: number; text: string }>;
    };
    log.info('pdf-service call complete');

    // Only use the first 3 chunks for classification
    const first3Chunks = extractData.chunks.slice(0, 3);
    const concatenatedText = first3Chunks.map((c) => c.text).join('\n');

    // 4. Build classification prompt
    const systemPrompt = `You are an expert Indian insurance policy analyst. You will be given
text extracted from an insurance policy document. Your job is to classify
the policy and identify its key sections.

You MUST respond with valid JSON only. No explanation, no markdown.

Response format:
{
  "policy_type": "health" | "term_life" | "vehicle",
  "insurer": "<insurer name as it appears in the document>",
  "detected_sections": ["<section names found in the document>"],
  "extraction_schema": {
    "exclusions": ["<what to look for>"],
    "waiting_periods": ["<what to look for>"],
    "sublimits": ["<what to look for>"],
    "copayments": ["<what to look for>"],
    "coverage": ["<what to look for>"]
  }
}

For extraction_schema, provide 3-5 specific things to look for in each
category based on what you have seen in this specific policy type and
insurer.`;

    const userPrompt = `Classify this insurance policy and identify its sections.

Extracted text from first sections of the policy:
${concatenatedText}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 5. Call LLM Provider (Groq)
    const llmRes = await getLLMProvider().complete(messages, {
      response_format: { type: 'json_object' },
    });
    log.info('Groq call complete');

    // 6. Parse and validate JSON
    const parsed = JSON.parse(llmRes.content);
    log.info({ pass0_raw_result: parsed }, 'Pass 0 result');

    // 7. Validate response fields
    if (!parsed.policy_type || !parsed.insurer || !parsed.detected_sections || !parsed.extraction_schema) {
      throw new Error('LLM response missing required classification fields');
    }

    const validTypes = ['health', 'term_life', 'vehicle'];
    if (!validTypes.includes(parsed.policy_type)) {
      throw new Error(`Invalid policy_type from LLM: ${parsed.policy_type}`);
    }

    if (!Array.isArray(parsed.detected_sections)) {
      throw new Error('detected_sections must be an array');
    }

    const schema = parsed.extraction_schema;
    const requiredSchemaKeys = ['exclusions', 'waiting_periods', 'sublimits', 'copayments', 'coverage'];
    for (const key of requiredSchemaKeys) {
      if (!schema[key] || !Array.isArray(schema[key])) {
        throw new Error(`extraction_schema missing or invalid key: ${key}`);
      }
    }

    return {
      policy_type: parsed.policy_type as 'health' | 'term_life' | 'vehicle',
      insurer: parsed.insurer,
      detected_sections: parsed.detected_sections,
      extraction_schema: schema,
      chunking_strategy: extractData.chunking_strategy,
    };
  } catch (error: any) {
    log.error({ err: error }, `Pass 0 failed: ${error.message}`);
    throw error;
  }
}
