import type { Config } from '../../../config.js';
import type { LLMProvider } from '../provider.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

export function createLLMProvider(config: Config): LLMProvider {
  switch (config.LLM_PROVIDER) {
    case 'openai':
      // Required by config.superRefine; assertion documents the invariant.
      return new OpenAIProvider({
        apiKey: config.OPENAI_API_KEY!,
        model: config.LLM_MODEL,
      });
    case 'anthropic':
      return new AnthropicProvider({
        apiKey: config.ANTHROPIC_API_KEY!,
        model: config.LLM_MODEL,
      });
  }
}
