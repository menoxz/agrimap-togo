import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDataLoader } from '@/hooks/useDataLoader';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFECTURE_DATA_URL = '/data/prefecture_synthesis.geojson';

/**
 * Custom pane: above tile-pane (z=200), below overlay-pane analysis layers (z=400).
 */
const PANE_NAME = 'prefectures-pane';
const PANE_Z_INDEX = 350;

/** Togo Heritage yellow — used for the selected-prefecture highlight. */
const SELECTED_COLOR = '#FFD100';

/**
 * Highlight pane — sits above analysis overlay layers (z=400) so the yellow
 * dashed border remains visible even when analysis polygons cover the map.
 */
const HIGHLIGHT_PANE_NAME = 'selected-prefecture-pane';
const HIGHLIGHT_PANE_Z_INDEX = 450;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrefectureLayerProps {
  /** If set, this prefecture is highlighted in Togo Heritage yellow. */
  selectedPrefecture?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * PrefectureLayer — Administrative outline of prefectures (ADM2).
 *
 * Fetches `/data/prefecture_synthesis.geojson` (37 préfectures) and renders
 * each as an unfilled outline polygon via Leaflet's imperative API.
 *
 * This layer is NON-INTERACTIVE: no fill, no popups, no click handlers.
 * Interaction is handled by the 5 analysis layers (DensityLayer, etc.).
 *
 * When `selectedPrefecture` is set, a dedicated highlight layer (pane z=450,
 * above all analysis overlays) draws a Togo Heritage yellow dashed border
 * (#FFD100) on the matching feature — always visible regardless of active
 * analysis layers.
 *
 * Must be rendered inside a <MapContainer> (react-leaflet context required).
 */
export default function PrefectureLayer({ selectedPrefecture }: PrefectureLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const highlightLayerRef = useRef<L.GeoJSON | null>(null);
  const { data } = useDataLoader(PREFECTURE_DATA_URL);

  // ── Effect 1: create the highlight pane once on mount ──────────────────
  useEffect(() => {
    if (!map.getPane(HIGHLIGHT_PANE_NAME)) {
      const pane = map.createPane(HIGHLIGHT_PANE_NAME);
      pane.style.zIndex = String(HIGHLIGHT_PANE_Z_INDEX);
    }
  }, [map]);

  // ── Effect 2: manage highlight layer for the selected prefecture ────────
  useEffect(() => {
    // Remove any previous highlight before creating a new one
    highlightLayerRef.current?.remove();
    highlightLayerRef.current = null;

    if (selectedPrefecture && data?.features?.length) {
      const feature = data.features.find(
        (f) => f.properties?.nom_prefecture === selectedPrefecture,
      );
      if (feature) {
        highlightLayerRef.current = L.geoJSON(
          [feature] as unknown as Parameters<typeof L.geoJSON>[0],
          {
            pane: HIGHLIGHT_PANE_NAME,
            style: {
              color: SELECTED_COLOR,
              weight: 4,
              fillOpacity: 0,
              dashArray: '6 3',
              opacity: 1,
            },
            interactive: false,
          },
        ).addTo(map);
      }
    }

    return () => {
      highlightLayerRef.current?.remove();
      highlightLayerRef.current = null;
    };
  }, [selectedPrefecture, data, map]);

  // ── Effect 3: create / destroy layer when data loads ──────────────
  useEffect(() => {
    // ── 1. Ensure the custom pane exists ──────────────────────────────────
    if (!map.getPane(PANE_NAME)) {
      map.createPane(PANE_NAME);
      const paneEl = map.getPane(PANE_NAME);
      if (paneEl) {
        paneEl.style.zIndex = String(PANE_Z_INDEX);
        paneEl.style.pointerEvents = 'auto';
      }
    }

    // ── 2. Remove any previously created layer ────────────────────────────
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!data?.features?.length) return;

    // ── 3. Build the GeoJSON polygon layer (non-interactive outline) ──────
    const geoJsonLayer = L.geoJSON(
      data as unknown as Parameters<typeof L.geoJSON>[0],
      {
        pane: PANE_NAME,

        style: () => ({
          fill: false,
          fillOpacity: 0,
          weight: 0.5,
          color: '#666',
          opacity: 0.8,
        }),

        // No onEachFeature — this layer is purely an administrative outline.
        // Interaction is handled by analysis layers.
      },
    );

    geoJsonLayer.addTo(map);
    layerRef.current = geoJsonLayer;

    // ── 4. Cleanup on unmount ─────────────────────────────────────────────
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [data, map]);

  // No DOM output — all rendering is via Leaflet's imperative API
  return null;
}
