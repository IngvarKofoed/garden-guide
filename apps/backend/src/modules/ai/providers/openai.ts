import OpenAI from 'openai';
import {
  CarePlanResponseSchema,
  IdentifyPlantResponseSchema,
  PlantDescriptionResponseSchema,
  PlantIconResponseSchema,
  RefineCarePlanResponseSchema,
  type CarePlanResponse,
  type IdentifyPlantResponse,
  type PlantDescriptionResponse,
  type PlantIconResponse,
  type RefineCarePlanResponse,
} from '@garden-guide/shared';
import { UpstreamError } from '../../../lib/errors.js';
import {
  carePlanSystemPrompt,
  carePlanUserPrompt,
} from '../prompts/care-plan.js';
import {
  identifyPlantSystemPrompt,
  identifyPlantUserPrompt,
} from '../prompts/identify-plant.js';
import {
  plantDescriptionSystemPrompt,
  plantDescriptionUserPrompt,
} from '../prompts/plant-description.js';
import { plantIconPrompt } from '../prompts/plant-icon.js';
import {
  refineCarePlanSystemPrompt,
  refineCarePlanUserPrompt,
} from '../prompts/refine-care-plan.js';
import type {
  CarePlanProviderInput,
  IdentifyPlantProviderInput,
  LLMProvider,
  LLMProviderInfo,
  PlantDescriptionProviderInput,
  PlantIconProviderInput,
  RefineCarePlanProviderInput,
} from '../provider.js';

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  imageModel?: string;
  client?: OpenAI;
}

export const DEFAULT_OPENAI_MODEL = 'gpt-4o';
export const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-1';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export class OpenAIProvider implements LLMProvider {
  readonly info: LLMProviderInfo;
  private readonly client: OpenAI;
  private readonly imageModel: string;

  constructor(opts: OpenAIProviderOptions) {
    this.client = opts.client ?? new OpenAI({ apiKey: opts.apiKey });
    this.info = { name: 'openai', model: opts.model ?? DEFAULT_OPENAI_MODEL };
    this.imageModel = opts.imageModel ?? DEFAULT_OPENAI_IMAGE_MODEL;
  }

  async identifyPlant(input: IdentifyPlantProviderInput): Promise<IdentifyPlantResponse> {
    const userText = identifyPlantUserPrompt(input);
    const userMessage: ChatMessage = input.photo
      ? {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.photo.mimeType};base64,${input.photo.bytes.toString('base64')}`,
              },
            },
          ],
        }
      : { role: 'user', content: userText };

    const raw = await this.callJsonModel([
      { role: 'system', content: identifyPlantSystemPrompt },
      userMessage,
    ]);
    return parseOrThrow(IdentifyPlantResponseSchema, raw, 'identify-plant');
  }

  async generateCarePlan(input: CarePlanProviderInput): Promise<CarePlanResponse> {
    const raw = await this.callJsonModel([
      { role: 'system', content: carePlanSystemPrompt },
      { role: 'user', content: carePlanUserPrompt(input) },
    ]);
    return parseOrThrow(CarePlanResponseSchema, raw, 'care-plan');
  }

  async refineCarePlan(input: RefineCarePlanProviderInput): Promise<RefineCarePlanResponse> {
    const raw = await this.callJsonModel([
      { role: 'system', content: refineCarePlanSystemPrompt },
      { role: 'user', content: refineCarePlanUserPrompt(input) },
    ]);
    return parseOrThrow(RefineCarePlanResponseSchema, raw, 'refine-care-plan');
  }

  async describePlant(input: PlantDescriptionProviderInput): Promise<PlantDescriptionResponse> {
    const raw = await this.callJsonModel([
      { role: 'system', content: plantDescriptionSystemPrompt },
      { role: 'user', content: plantDescriptionUserPrompt(input) },
    ]);
    return parseOrThrow(PlantDescriptionResponseSchema, raw, 'plant-description');
  }

  async generatePlantIcon(input: PlantIconProviderInput): Promise<PlantIconResponse> {
    let result;
    try {
      result = await this.client.images.generate({
        model: this.imageModel,
        prompt: plantIconPrompt(input),
        n: 1,
        size: '1024x1024',
      });
    } catch (err) {
      throw new UpstreamError('OpenAI image generation failed', {
        cause: errorMessage(err),
      });
    }
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new UpstreamError('OpenAI image response was empty');
    }
    return parseOrThrow(
      PlantIconResponseSchema,
      { imageBase64: b64, mimeType: 'image/png' },
      'plant-icon',
    );
  }

  private async callJsonModel(messages: ChatMessage[]): Promise<unknown> {
    let completion;
    try {
      completion = await this.client.chat.completions.create({
        model: this.info.model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
    } catch (err) {
      throw new UpstreamError('OpenAI request failed', { cause: errorMessage(err) });
    }
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new UpstreamError('OpenAI returned an empty response');
    }
    try {
      return JSON.parse(content);
    } catch {
      throw new UpstreamError('OpenAI returned non-JSON content', { content });
    }
  }
}

function parseOrThrow<T>(
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: unknown } },
  raw: unknown,
  label: string,
): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new UpstreamError(`OpenAI returned a malformed ${label} response`, {
      issues: result.error,
    });
  }
  return result.data;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
