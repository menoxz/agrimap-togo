/**
 * Central export file for all layer class breaks.
 * This allows MapLegend and other components to import them without
 * circular dependencies.
 */

export { DENSITY_CLASS_BREAKS } from './DensityLayer';
export { ZAAP_CLASS_BREAKS } from './ZAAPLayer';
export { ACCESS_CLASS_BREAKS } from './AccessibilityLayer';
export { COOP_CLASS_BREAKS } from './CoopLayer';
export { SYNTHESIS_CLASS_BREAKS } from './SynthesisLayer';

import type { AnalysisType } from '@/types/map';

/** GeoJSON URL for the prefecture (ADM2) synthesis overlay. */
export const PREFECTURE_GEOJSON_URL = '/data/prefecture_synthesis.geojson';

/** Maps each analysis layer to its downloadable GeoJSON path (served from /public/data/). */
export const LAYER_GEOJSON_URLS: Record<AnalysisType, string> = {
  density: '/data/density.geojson',
  zaap: '/data/zaap_coverage.geojson',
  access: '/data/accessibility.geojson',
  coop: '/data/cooperative_network.geojson',
  synthesis: '/data/synthesis.geojson',
};

/** Short file name slug used in download filenames. */
export const LAYER_FILE_SLUGS: Record<AnalysisType, string> = {
  density: 'density',
  zaap: 'zaap',
  access: 'accessibility',
  coop: 'cooperative-network',
  synthesis: 'synthesis',
};
