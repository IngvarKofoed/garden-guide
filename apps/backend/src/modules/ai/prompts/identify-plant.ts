import type { IdentifyPlantProviderInput } from '../provider.js';

export const identifyPlantSystemPrompt = [
  'You are a horticultural expert helping a home gardener identify a plant.',
  'Reply with a ranked list of likely candidates from most to least probable.',
  'For each candidate provide: a common name, the binomial species (or null if unsure),',
  'a confidence score between 0 and 1, and a short note (under 200 words) on identifying',
  'features and care expectations.',
  'Be honest about uncertainty — confidence should reflect available evidence.',
  'Respond ONLY with a JSON object matching this exact shape:',
  '{ "candidates": [ { "commonName": string, "species": string | null,',
  '"confidence": number, "notes": string } ] }',
  'Return between 1 and 5 candidates.',
].join(' ');

export function identifyPlantUserPrompt(input: IdentifyPlantProviderInput): string {
  const lines: string[] = [];
  if (input.name) lines.push(`User-supplied name or description: ${input.name}`);
  if (input.photo) lines.push('A photo is attached for visual reference.');
  if (lines.length === 0) {
    lines.push('No identifying details supplied.');
  }
  return lines.join('\n');
}
