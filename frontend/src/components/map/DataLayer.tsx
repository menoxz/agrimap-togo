import { useCallback, useEffect, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDataLoader } from '@/hooks/useDataLoader';
import Skeleton from '@/components/ui/Skeleton';
import type { GeoJsonFeature, GeoJsonFeatureCollection } from '@/types/map';

/**
 * Clustering threshold: if features exceed this count, marker clustering is recommended.
 * For polygon data (regions), we always use vector rendering.
 * This flag is relevant for point-based layers only.
 */
const CLUSTER_THRESHOLD = 500;

type GeoJsonStyle = L.PathOptions;

export interface DataLayerProps {
  url: string;
  layerId: string;
  visible?: boolean;
  /** Region filter: only show features matching this region name */
  regionFilter?: string;
  /** Région à surligner (nom région). Si null ou undefined, pas de highlight. */
  highlightedRegion?: string | null;
  /** Style function for features */
  style?: (feature: GeoJsonFeature) => GeoJsonStyle;
  /** Called when feature is clicked */
  onEachFeature?: (feature: GeoJsonFeature, layer: L.Layer) => void;
  /** Filter function applied client-side */
  filter?: (feature: GeoJsonFeature) => boolean;
  /** Use clustering for point data */
  useClustering?: boolean;
  /** Custom attribution */
  attribution?: string;
}

/**
 * DataLayer — Generic GeoJSON layer for the AgriMap.
 * Loads data via useDataLoader, renders as Leaflet GeoJSON layer with react-leaflet.
 * Supports region filtering, custom styles, popups, and clustering for points.
 */
export default function DataLayer({
  url,
  layerId,
  visible = true,
  regionFilter,
  highlightedRegion,
  style: styleFn,
  onEachFeature: onEachFeatureFn,
  filter: filterFn,
  useClustering = false,
  attribution,
}: DataLayerProps) {
  const { data, loading, error } = useDataLoader(url);
  const map = useMap();
  const geoJsonKey = useRef(0);

  // Force re-render when visibility or highlighted region changes
  useEffect(() => {
    geoJsonKey.current += 1;
  }, [visible, regionFilter, highlightedRegion, url]);

  if (!visible) return null;

  // Loading state
  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
        <div className="bg-white/90 rounded-md shadow-sm p-4 flex items-center gap-3">
          <Skeleton variant="card" width="200px" height="24px" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-md shadow-md px-4 py-2 text-body-sm text-error border border-red-200">
        ⚠ Erreur: {error}
      </div>
    );
  }

  if (!data || !data.features || data.features.length === 0) return null;

  // Determine if this is point data (for clustering)
  const hasPoints = data.features.some(
    (f) => f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint',
  );
  const shouldCluster = hasPoints && useClustering && data.features.length > CLUSTER_THRESHOLD;

  // Apply region filter
  let features = data.features;
  if (regionFilter) {
    const lowerRegion = regionFilter.toLowerCase();
    features = features.filter((f) => {
      const regionProp =
        (f.properties.region as string) ||
        (f.properties.nom_region as string) ||
        '';
      return regionProp.toLowerCase() === lowerRegion;
    });
  }

  // Apply custom filter
  if (filterFn) {
    features = features.filter(filterFn);
  }

  if (features.length === 0) return null;

  // Build a filtered FeatureCollection for rendering
  const filteredData: GeoJsonFeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  const defaultStyle: GeoJsonStyle = {
    weight: 1,
    opacity: 0.8,
    color: '#1B5E20',
    fillOpacity: 0.3,
  };

  const pointToLayer = shouldCluster
    ? (_feature: GeoJsonFeature, latlng: L.LatLngExpression) => L.marker(latlng)
    : undefined;

  // Effective style: applies highlight when highlightedRegion matches, dims others
  const effectiveStyle = useCallback(
    (feature: GeoJsonFeature) => {
      const base = styleFn
        ? styleFn(feature)
        : { weight: 1, opacity: 0.8, color: '#1B5E20', fillOpacity: 0.3 };
      if (!highlightedRegion) return base;

      const region = feature.properties?.region as string | undefined;
      const nomRegion = feature.properties?.nom_region as string | undefined;
      const fr = (region || nomRegion || '').toLowerCase();
      const isHL = fr === highlightedRegion.toLowerCase();

      if (isHL) return { ...base, fillOpacity: 0.9, weight: 3, color: '#D21034' };
      return { ...base, fillOpacity: 0.1, weight: 0.5, color: '#ccc' };
    },
    [styleFn, highlightedRegion],
  );

  return (
    <GeoJSON
      key={`${layerId}-${geoJsonKey.current}-${highlightedRegion ?? 'none'}`}
      data={filteredData}
      style={(feature) => effectiveStyle(feature as GeoJsonFeature)}
      onEachFeature={(feature, layer) => {
        if (onEachFeatureFn) {
          onEachFeatureFn(feature as GeoJsonFeature, layer);
        }
        // Default popup binding if no custom handler set popup
        if (!onEachFeatureFn && feature.properties) {
          const name =
            (feature.properties.nom_region as string) ||
            (feature.properties.region as string) ||
            'Région';
          layer.bindPopup(`<b>${name}</b>`);
        }
      }}
      attribution={attribution}
      pointToLayer={pointToLayer}
    />
  );
}
