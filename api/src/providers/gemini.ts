import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMMessage, LLMOptions, LLMResponse, LLMProvider } from './llm';
import { config } from '../config';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('Missing Gemini API Key configuration');
    }
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    try {
      const systemMessage = messages.find((m) => m.role === 'system');
      const systemInstruction = systemMessage ? systemMessage.content : undefined;

      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          const role = m.role === 'assistant' ? 'model' : 'user';
          return {
            role,
            parts: [{ text: m.content }],
          };
        });

      const modelCandidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
      let candidateIdx = 0;
      let modelName = modelCandidates[candidateIdx];
      let generativeModel = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const generationConfig: any = {
        temperature: options?.temperature,
        maxOutputTokens: options?.max_tokens,
      };

      if (options?.response_format?.type === 'json_object') {
        generationConfig.responseMimeType = 'application/json';
      }

      const maxRetries = 3;
      let attempt = 0;
      let lastErr: any;

      while (attempt <= maxRetries) {
        try {
          const result = await generativeModel.generateContent({
            contents,
            generationConfig,
          });

          const response = result.response;
          let content = response.text() || '';

          if (options?.response_format?.type === 'json_object') {
            const trimmed = content.trim();
            const firstBrace = trimmed.indexOf('{');
            const firstBracket = trimmed.indexOf('[');
            let startIdx = -1;
            let endIdx = -1;

            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
              startIdx = firstBrace;
              endIdx = trimmed.lastIndexOf('}');
            } else if (firstBracket !== -1) {
              startIdx = firstBracket;
              endIdx = trimmed.lastIndexOf(']');
            }

            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              content = trimmed.substring(startIdx, endIdx + 1);
            } else if (trimmed.startsWith('```')) {
              content = trimmed
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/, '')
                .replace(/\s*```$/, '')
                .trim();
            }
          }

          const inputTokens = response.usageMetadata?.promptTokenCount || 0;
          const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

          return {
            content,
            model: modelName,
            usage: {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
            },
          };
        } catch (err: any) {
          lastErr = err;
          const errString = err.message || String(err);
          const is503 = err.status === 503 || errString.includes('503') || errString.includes('Service Unavailable');
          const is429 = err.status === 429 || errString.includes('429') || errString.includes('Quota exceeded') || errString.includes('Too Many Requests');
          const is404 = err.status === 404 || errString.includes('404') || errString.includes('not found') || errString.includes('not supported');

          if ((is429 || is404) && candidateIdx < modelCandidates.length - 1) {
            candidateIdx++;
            const prevModel = modelName;
            modelName = modelCandidates[candidateIdx];
            console.warn(`[GeminiProvider] Model ${prevModel} failed with ${is429 ? '429 Quota' : '404 Unsupported'}. Falling back to candidate: ${modelName}...`);
            generativeModel = this.genAI.getGenerativeModel({
              model: modelName,
              systemInstruction,
            });
            attempt = 0;
            continue;
          }

          if (is503 && attempt < maxRetries) {
            attempt++;
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(`[GeminiProvider] 503/Service Unavailable for ${modelName}. Retrying attempt ${attempt}/${maxRetries} in ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          if (is503 && candidateIdx < modelCandidates.length - 1) {
            candidateIdx++;
            const prevModel = modelName;
            modelName = modelCandidates[candidateIdx];
            console.warn(`[GeminiProvider] 503 persisted for ${prevModel}. Falling back to candidate: ${modelName}...`);
            generativeModel = this.genAI.getGenerativeModel({
              model: modelName,
              systemInstruction,
            });
            attempt = 0;
            continue;
          }

          throw err;
        }
      }
      throw lastErr;
    } catch (err: any) {
      throw new Error(`Gemini API completion failed: ${err.message || err}`);
    }
  }
}
