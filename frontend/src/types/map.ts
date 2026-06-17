/**
 * GeoJSON types for AgriMap Togo
 */

export interface GeoJsonPropertyMap {
  [key: string]: string | number | boolean | null | undefined;
}

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][][][] | number[][][] | number[][] | number[];
  };
  properties: GeoJsonPropertyMap;
  id?: string | number;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
  metadata?: Record<string, unknown>;
}

export type AnalysisType = 'density' | 'zaap' | 'access' | 'coop' | 'synthesis';

export const ANALYSIS_TYPES: readonly AnalysisType[] = [
  'density',
  'zaap',
  'access',
  'coop',
  'synthesis',
] as const;

export interface MapFilters {
  selectedRegion: string;
  /** ADM2 prefecture filter — '' means no filter */
  selectedPrefecture: string;
  activeLayers: AnalysisType[];
  zaapOnlyUncovered: boolean;
}

export interface LayerConfig {
  id: AnalysisType;
  labelKey: string;
  colorPalette: readonly string[];
  dataUrl: string;
  propertyKey: string;
  classLabels: readonly string[];
  unit?: string;
}
