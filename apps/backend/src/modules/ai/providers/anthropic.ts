import { UpstreamError } from '../../../lib/errors.js';
import type {
  CarePlanProviderInput,
  IdentifyPlantProviderInput,
  LLMProvider,
  LLMProviderInfo,
  PlantDescriptionProviderInput,
  PlantIconProviderInput,
  RefineCarePlanProviderInput,
} from '../provider.js';

export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
}

export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest';

const NOT_IMPLEMENTED =
  'Anthropic provider is not yet implemented. Set LLM_PROVIDER=openai or implement providers/anthropic.ts.';

export class AnthropicProvider implements LLMProvider {
  readonly info: LLMProviderInfo;

  constructor(opts: AnthropicProviderOptions) {
    void opts;
    this.info = { name: 'anthropic', model: opts.model ?? DEFAULT_ANTHROPIC_MODEL };
  }

  async identifyPlant(_input: IdentifyPlantProviderInput): Promise<never> {
    throw new UpstreamError(NOT_IMPLEMENTED);
  }

  async generateCarePlan(_input: CarePlanProviderInput): Promise<never> {
    throw new UpstreamError(NOT_IMPLEMENTED);
  }

  async refineCarePlan(_input: RefineCarePlanProviderInput): Promise<never> {
    throw new UpstreamError(NOT_IMPLEMENTED);
  }

  async describePlant(_input: PlantDescriptionProviderInput): Promise<never> {
    throw new UpstreamError(NOT_IMPLEMENTED);
  }

  async generatePlantIcon(_input: PlantIconProviderInput): Promise<never> {
    throw new UpstreamError(NOT_IMPLEMENTED);
  }
}
