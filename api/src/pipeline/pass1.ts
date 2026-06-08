import pino from 'pino';
import { query } from '../db/client';
import { getGeminiProvider, LLMMessage } from '../providers';
import { Pass0Result, ExtractChunk } from './pass0';
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

interface ExtractedClause {
  clause_type: 'exclusion' | 'waiting_period' | 'sublimit' | 'copayment' | 'coverage';
  raw_text: string;
  page_number?: number | null;
  section_ref?: string | null;
}

export async function runPass1(
  jobId: string,
  policyId: string,
  requestId: string,
  pass0Result: Pass0Result,
  chunks: ExtractChunk[]
): Promise<void> {
  const log = logger.child({ request_id: requestId, job_id: jobId, policy_id: policyId });
  log.info('Pass 1 start');

  const validClauseTypes = new Set(['exclusion', 'waiting_period', 'sublimit', 'copayment', 'coverage']);
  const seenClauses = new Set<string>();
  const clausesToInsert: ExtractedClause[] = [];

  try {
    const gemini = getGeminiProvider();

    // 1. Process chunks sequentially
    for (const chunk of chunks) {
      log.info(
        { chunk_index: chunk.chunk_index, section_ref: chunk.section_ref },
        `Processing chunk ${chunk.chunk_index}`
      );

      const systemPrompt = `You are an expert Indian insurance policy analyst performing structured
data extraction. You will be given a section of an insurance policy
document.

Extract EVERY clause that falls into these categories:
- exclusion: anything the policy does NOT cover
- waiting_period: any time period before coverage begins
- sublimit: any cap or maximum limit on a specific benefit
- copayment: any cost-sharing requirement on the policyholder
- coverage: what the policy explicitly covers

CRITICAL RULES:
- Extract verbatim. Do not paraphrase. Do not summarize.
- Do not omit any clause even if it seems minor.
- Do not infer or add information not present in the text.
- If a clause fits multiple categories, extract it once under the most
  specific category.

You MUST respond with a JSON array only. No explanation, no markdown.

Response format:
[
  {
    "clause_type": "exclusion" | "waiting_period" | "sublimit" |
                    "copayment" | "coverage",
    "raw_text": "<verbatim text from the document>",
    "page_number": <number or null>,
    "section_ref": "<section name or null>"
  }
]`;

      const userPrompt = `Extract all clauses from this policy section.

Policy type: ${pass0Result.policy_type}
Insurer: ${pass0Result.insurer}
Section: ${chunk.section_ref || 'Unknown'}
Pages: ${chunk.page_start} to ${chunk.page_end}

Focus especially on these patterns for each category:
${JSON.stringify(pass0Result.extraction_schema, null, 2)}

Policy text:
${chunk.text}`;

      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // Call Gemini
      const geminiRes = await gemini.complete(messages, {
        response_format: { type: 'json_object' },
        temperature: 0,
      });

      // Parse JSON array
      let content = geminiRes.content.trim();
      if (content.startsWith('```')) {
        content = content
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '');
      }

      let parsed: any[];
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        log.warn({ content, err: parseError }, 'Failed to parse Gemini output as JSON, skipping chunk');
        continue;
      }

      if (!Array.isArray(parsed)) {
        log.warn('Gemini response is not a JSON array, skipping chunk');
        continue;
      }

      let chunkClauseCount = 0;

      for (const item of parsed) {
        // Validation: clause_type and raw_text are required
        if (!item.clause_type || !item.raw_text) {
          throw new Error('Extracted clause missing clause_type or raw_text');
        }

        const normalizedType = item.clause_type.toLowerCase().trim().replace(' ', '_');
        if (!validClauseTypes.has(normalizedType)) {
          log.warn({ item }, `Skipping item with invalid clause_type: ${item.clause_type}`);
          continue;
        }

        // Deduplication
        const textSnippet = item.raw_text.substring(0, 100).toLowerCase().trim();
        const dupKey = `${normalizedType}:${textSnippet}`;
        if (seenClauses.has(dupKey)) {
          continue;
        }
        seenClauses.add(dupKey);

        // Map defaults for page_number and section_ref
        const pageNumber = typeof item.page_number === 'number' ? item.page_number : chunk.page_start;
        const sectionRef = typeof item.section_ref === 'string' && item.section_ref ? item.section_ref : chunk.section_ref;

        clausesToInsert.push({
          clause_type: normalizedType as any,
          raw_text: item.raw_text,
          page_number: pageNumber,
          section_ref: sectionRef,
        });

        chunkClauseCount++;
      }

      log.info({ chunk_index: chunk.chunk_index, count: chunkClauseCount }, `Chunk ${chunk.chunk_index} processed`);
    }

    // 5. Batch INSERT into extractions table
    if (clausesToInsert.length > 0) {
      const valuePlaceholders: string[] = [];
      const queryValues: any[] = [];

      for (let i = 0; i < clausesToInsert.length; i++) {
        const c = clausesToInsert[i];
        const offset = i * 5;
        valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
        queryValues.push(policyId, c.clause_type, c.raw_text, c.page_number, c.section_ref);
      }

      const sql = `
        INSERT INTO extractions (policy_id, clause_type, raw_text, page_number, section_ref)
        VALUES ${valuePlaceholders.join(', ')}
      `;

      await query(sql, queryValues);
      log.info({ total_inserted: clausesToInsert.length }, 'Total clauses inserted');
    } else {
      log.info('No clauses extracted to insert');
    }
  } catch (error: any) {
    log.error({ err: error }, `Pass 1 failed: ${error.message}`);
    throw error;
  }
}
