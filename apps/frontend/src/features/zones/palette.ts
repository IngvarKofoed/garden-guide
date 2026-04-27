import {
  ZONE_AREA_TOKENS,
  ZONE_STRUCTURE_TOKENS,
  type ZoneColorToken,
  type ZoneKind,
} from '@garden-guide/shared';

export interface PaletteEntry {
  fill: string;
  stroke: string;
  label: string;
}

export const ZONE_PALETTE: Record<ZoneColorToken, PaletteEntry> = {
  moss: { fill: '#7A8B69', stroke: '#5C6E4D', label: 'Moss' },
  fern: { fill: '#92A380', stroke: '#73856A', label: 'Fern' },
  olive: { fill: '#9C9968', stroke: '#7E7B4F', label: 'Olive' },
  pine: { fill: '#65775E', stroke: '#4A5A45', label: 'Pine' },
  terracotta: { fill: '#C9A07C', stroke: '#A77E5C', label: 'Terracotta' },
  sand: { fill: '#D6C49E', stroke: '#B5A37C', label: 'Sand' },
  'dusty-rose': { fill: '#C9A9A2', stroke: '#A88882', label: 'Dusty rose' },
  lavender: { fill: '#B0A8C0', stroke: '#8F87A0', label: 'Lavender' },
  slate: { fill: '#8E8E84', stroke: '#6F6F65', label: 'Slate' },
  charcoal: { fill: '#5C5C58', stroke: '#3F3F3B', label: 'Charcoal' },
  stone: { fill: '#B0AC9F', stroke: '#908C80', label: 'Stone' },
};

export function tokensForKind(kind: ZoneKind): readonly ZoneColorToken[] {
  return kind === 'structure' ? ZONE_STRUCTURE_TOKENS : ZONE_AREA_TOKENS;
}
