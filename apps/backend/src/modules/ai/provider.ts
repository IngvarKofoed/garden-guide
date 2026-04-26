import type {
  CarePlanResponse,
  IdentifyPlantResponse,
  PlantDescriptionResponse,
  PlantIconResponse,
  RefineCarePlanResponse,
  SuggestedTask,
} from '@garden-guide/shared';

export interface LLMProviderInfo {
  name: 'openai' | 'anthropic';
  model: string;
}

export interface IdentifyPlantProviderInput {
  name?: string | null;
  photo?: { bytes: Buffer; mimeType: string };
}

export interface CarePlanProviderInput {
  commonName: string;
  species: string | null;
  notes: string | null;
}

export interface RefineCarePlanProviderInput extends CarePlanProviderInput {
  question: string;
  currentTasks: SuggestedTask[];
}

export interface PlantDescriptionProviderInput {
  commonName: string;
  species: string | null;
  notes: string | null;
}

export interface PlantIconProviderInput {
  commonName: string;
  species: string | null;
}

export interface LLMProvider {
  readonly info: LLMProviderInfo;
  identifyPlant(input: IdentifyPlantProviderInput): Promise<IdentifyPlantResponse>;
  generateCarePlan(input: CarePlanProviderInput): Promise<CarePlanResponse>;
  refineCarePlan(input: RefineCarePlanProviderInput): Promise<RefineCarePlanResponse>;
  describePlant(input: PlantDescriptionProviderInput): Promise<PlantDescriptionResponse>;
  generatePlantIcon(input: PlantIconProviderInput): Promise<PlantIconResponse>;
}
