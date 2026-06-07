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

      const modelName = 'gemini-2.5-flash';
      const generativeModel = this.genAI.getGenerativeModel({
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
          const content = response.text() || '';
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
          
          if (is503 && attempt < maxRetries) {
            attempt++;
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(`[GeminiProvider] 503/Service Unavailable. Retrying attempt ${attempt}/${maxRetries} in ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
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
