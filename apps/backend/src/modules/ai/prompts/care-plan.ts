import type { CarePlanProviderInput } from '../provider.js';

const ACTION_TYPES =
  'prune | fertilize | water | plant | transplant | harvest | sow | mulch | treat | inspect | custom';

export const carePlanSystemPrompt = [
  'You are a horticultural expert producing a year-round care plan for a single plant.',
  'Return a list of tasks the gardener should perform. Each task is either',
  '"recurring" (happens every year inside a coarse month slot) or "one_off"',
  '(a single event scheduled in a specific slot in the next 12 months).',
  `Allowed actionType values: ${ACTION_TYPES}.`,
  'When you choose "custom" you MUST provide a short customLabel describing the action.',
  'All scheduling uses coarse month slots (S = 1 early, days 1–10; 2 mid, 11–20;',
  '3 late, 21+) — never specific calendar days.',
  'Recurring tasks use year-agnostic "MM-S" slots: MM is 01–12, S is 1/2/3.',
  'recurStartSlot is the slot the task starts in; recurEndSlot is where it ends.',
  'A task that runs only inside one slot has recurStartSlot equal to recurEndSlot.',
  'A task may wrap the year (e.g. "11-2" → "02-3" for late autumn through late winter).',
  'One-off tasks use a "YYYY-MM-S" dueSlot in the next 12 months (same S = 1/2/3).',
  'Each task includes a short rationale (1–2 sentences) explaining why it is needed.',
  'Aim for a coherent plan: 4–10 tasks for a typical plant. Avoid duplicates.',
  'Respond ONLY with a JSON object matching this exact shape:',
  '{ "tasks": [',
  '  { "kind": "recurring", "actionType": string, "customLabel": string | null,',
  '    "recurStartSlot": "MM-S", "recurEndSlot": "MM-S", "rationale": string }',
  '  | { "kind": "one_off", "actionType": string, "customLabel": string | null,',
  '      "dueSlot": "YYYY-MM-S", "rationale": string }',
  '] }',
].join(' ');

export function carePlanUserPrompt(input: CarePlanProviderInput): string {
  const lines: string[] = [];
  if (input.gardenContext) {
    lines.push(`Garden context (applies to every plant in this garden): ${input.gardenContext}`);
  }
  lines.push(`Common name: ${input.commonName}`);
  if (input.species) lines.push(`Species: ${input.species}`);
  if (input.notes) lines.push(`Gardener's notes: ${input.notes}`);
  return lines.join('\n');
}
