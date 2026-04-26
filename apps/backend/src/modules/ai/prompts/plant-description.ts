import type { PlantDescriptionProviderInput } from '../provider.js';

export const plantDescriptionSystemPrompt = [
  'You are a horticultural writer producing a short, factual description of a plant',
  'for a private gardening guide. Two or three sentences (40–80 words).',
  'Cover: what the plant looks like, where it thrives, and one or two distinctive traits.',
  'Calm, plain prose. No marketing copy, no emoji, no headings.',
  'Respond ONLY with a JSON object matching this exact shape:',
  '{ "description": string }',
].join(' ');

export function plantDescriptionUserPrompt(input: PlantDescriptionProviderInput): string {
  const lines: string[] = [];
  if (input.gardenContext) {
    lines.push(`Garden context (applies to every plant in this garden): ${input.gardenContext}`);
  }
  lines.push(`Common name: ${input.commonName}`);
  if (input.species) lines.push(`Species: ${input.species}`);
  if (input.notes) lines.push(`Gardener's notes: ${input.notes}`);
  return lines.join('\n');
}
