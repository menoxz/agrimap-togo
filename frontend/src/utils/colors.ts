/**
 * ColorBrewer palettes (colorblind safe) for each analysis type.
 * Used by MapLegend and map layers.
 */

export const CB_DENSITY = [
  '#FFFFD4',
  '#FED98E',
  '#FE9929',
  '#D95F0E',
  '#993404',
] as const;

export const CB_ZAAP = [
  '#F7F7F7',
  '#D9F0D3',
  '#7FBF7B',
  '#1B7837',
] as const;

export const CB_ACCESS = [
  '#F2F0F7',
  '#CBC9E2',
  '#9E9AC8',
  '#756BB1',
  '#54278F',
] as const;

export const CB_COOP = [
  '#FEF0D9',
  '#FDCC8A',
  '#FC8D59',
  '#D7301F',
] as const;

export const CB_SYNTHESIS = [
  '#D73027',
  '#FC8D59',
  '#FEE08B',
  '#91CF60',
  '#1A9850',
] as const;

export const PALETTE_MAP: Record<string, readonly string[]> = {
  density: CB_DENSITY,
  zaap: CB_ZAAP,
  access: CB_ACCESS,
  coop: CB_COOP,
  synthesis: CB_SYNTHESIS,
};

export const ANALYSIS_TYPES = [
  'density',
  'zaap',
  'access',
  'coop',
  'synthesis',
] as const;

export type AnalysisType = (typeof ANALYSIS_TYPES)[number];
