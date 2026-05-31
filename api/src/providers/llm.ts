export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  complete(prompt: string, systemPrompt: string, options?: CompletionOptions): Promise<string>;
}

export class NotImplementedError extends Error {
  constructor(providerName: string, method: string = 'complete') {
    super(`Method '${method}' is not implemented for LLM Provider: ${providerName}`);
    this.name = 'NotImplementedError';
  }
}

export class GroqProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(
    prompt: string,
    systemPrompt: string,
    options?: CompletionOptions
  ): Promise<string> {
    throw new NotImplementedError('GroqProvider');
  }
}

export class GeminiProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(
    prompt: string,
    systemPrompt: string,
    options?: CompletionOptions
  ): Promise<string> {
    throw new NotImplementedError('GeminiProvider');
  }
}
