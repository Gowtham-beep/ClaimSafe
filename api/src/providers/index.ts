import { LLMProvider } from './llm';
import { GroqProvider } from './groq';
import { GeminiProvider } from './gemini';

let providerInstance: LLMProvider | null = null;
let geminiInstance: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!providerInstance) {
    providerInstance = new GroqProvider();
  }
  return providerInstance;
}

export function getGeminiProvider(): LLMProvider {
  if (!geminiInstance) {
    geminiInstance = new GeminiProvider();
  }
  return geminiInstance;
}

export * from './llm';
export * from './groq';
export * from './gemini';
