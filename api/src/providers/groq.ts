import Groq from 'groq-sdk';
import { LLMMessage, LLMOptions, LLMResponse, LLMProvider } from './llm';
import { config } from '../config';

export class GroqProvider implements LLMProvider {
  private groq: Groq;

  constructor() {
    if (!config.groqApiKey) {
      throw new Error('Missing Groq API Key configuration');
    }
    this.groq = new Groq({
      apiKey: config.groqApiKey,
    });
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    try {
      const model = 'llama-3.3-70b-versatile';
      
      const response = await this.groq.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        response_format: options?.response_format,
      });

      const content = response.choices[0]?.message?.content || '';
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;

      return {
        content,
        model,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
      };
    } catch (err: any) {
      throw new Error(`Groq API completion failed: ${err.message || err}`);
    }
  }
}
