import { LLMProvider } from './llm';
import { GroqProvider } from './groq';

let providerInstance: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!providerInstance) {
    providerInstance = new GroqProvider();
  }
  return providerInstance;
}

export * from './llm';
export * from './groq';
