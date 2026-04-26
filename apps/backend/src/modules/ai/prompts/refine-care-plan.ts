import type { RefineCarePlanProviderInput } from '../provider.js';

const ACTION_TYPES =
  'prune | fertilize | water | plant | transplant | harvest | sow | mulch | treat | inspect | custom';

export const refineCarePlanSystemPrompt = [
  'You are a horticultural expert refining an existing care plan for a single plant',
  "based on the gardener's question or observation.",
  'Return the FULL revised plan (not just a diff) plus a short explanation',
  '(1–3 sentences) of what changed and why.',
  `Allowed actionType values: ${ACTION_TYPES}.`,
  'Same task shape as the initial care plan: recurring tasks use year-agnostic',
  '"MM-S" slots (MM = 01–12, S = 1 early / 2 mid / 3 late) for recurStartSlot and',
  'recurEndSlot; one-off tasks use a "YYYY-MM-S" dueSlot within the next 12 months;',
  'each task includes a rationale. Never use specific calendar days.',
  'Respond ONLY with a JSON object matching this exact shape:',
  '{ "tasks": [ ...same shape as the initial plan... ],',
  '  "explanation": string }',
].join(' ');

export function refineCarePlanUserPrompt(input: RefineCarePlanProviderInput): string {
  const lines: string[] = [`Common name: ${input.commonName}`];
  if (input.species) lines.push(`Species: ${input.species}`);
  if (input.notes) lines.push(`Gardener's notes: ${input.notes}`);
  lines.push(`Current plan (JSON): ${JSON.stringify(input.currentTasks)}`);
  lines.push(`Gardener's question: ${input.question}`);
  return lines.join('\n');
}
