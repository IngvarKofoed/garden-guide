import type { PlantIconProviderInput } from '../provider.js';

// One-shot image prompt. Aims for a calm, hand-illustrated look that fits the
// app's palette and reads at small sizes (the icon is displayed at 64–128 px).
export function plantIconPrompt(input: PlantIconProviderInput): string {
  const subject = input.species
    ? `${input.commonName} (${input.species})`
    : input.commonName;
  return [
    `A simple, recognisable illustrated icon of ${subject}.`,
    'Centred subject on a soft cream background with subtle hand-drawn shading.',
    'Calm botanical-illustration style. Muted greens and earth tones.',
    'No text, no borders, no frames, no captions, no labels.',
    'Square composition that reads clearly at small sizes (64–128 px).',
  ].join(' ');
}
