import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { useDataLoader } from '@/hooks/useDataLoader';

// ─── Constants ────────────────────────────────────────────────────────────────

const PREFECTURE_DATA_URL = '/data/prefecture_synthesis.geojson';

/**
 * Custom pane: above tile-pane (z=200), below overlay-pane analysis layers (z=400),
 * and well below marker-pane (z=600).
 * Note: When analysis layers are active (in overlay-pane z=400), they intercept
 * pointer events before reaching this pane. The click/hover handlers are still
 * registered and fire in areas not covered by analysis polygons.
 */
const PANE_NAME = 'prefectures-pane';
const PANE_Z_INDEX = 350;

/** Togo Heritage yellow — used for the selected-prefecture highlight. */
const SELECTED_COLOR = '#FFD100';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrefectureLayerProps {
  /** If set, this prefecture is highlighted in Togo Heritage yellow. */
  selectedPrefecture?: string;
}

interface PrefectureProperties {
  nom_prefecture: string;
  region: string;
  n_cooperatives: number;
  n_marches: number;
  n_pepinieres: number;
  n_zaap: number;
  n_exploitations: number;
  service_score: number;
  priority_level: string;
  color: string;
}

// ─── Popup Component (renderToString — no hooks) ──────────────────────────────

interface PrefecturePopupProps {
  props: PrefectureProperties;
}

function PrefecturePopup({ props }: PrefecturePopupProps) {
  const scoreColor =
    props.service_score >= 60
      ? '#1A9641'
      : props.service_score >= 40
        ? '#FDAE61'
        : '#D7191C';

  const stats: Array<[string, string, number]> = [
    ['🛒', 'Marchés', props.n_marches],
    ['🤝', 'Coopératives', props.n_cooperatives],
    ['🌱', 'ZAAP', props.n_zaap],
    ['🌿', 'Pépinières', props.n_pepinieres],
    ['🏡', 'Exploitations', props.n_exploitations],
  ];

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minWidth: '200px',
        maxWidth: '260px',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: props.color,
          color: '#fff',
          padding: '8px 10px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 800 }}>
          {props.nom_prefecture}
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 400,
            opacity: 0.9,
            marginTop: '2px',
          }}
        >
          📍 {props.region}
        </div>
      </div>

      {/* Score + Priority */}
      <div
        style={{
          background: '#f8f9fa',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid #e9ecef',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: scoreColor }}>
            {props.service_score.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: '9px',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Score
          </div>
        </div>
        <div
          style={{
            flex: 1,
            fontSize: '11px',
            fontWeight: 600,
            color: scoreColor,
            background: `${scoreColor}22`,
            borderRadius: '4px',
            padding: '3px 7px',
            textAlign: 'center',
          }}
        >
          {props.priority_level}
        </div>
      </div>

      {/* Stats table */}
      <div style={{ padding: '8px 10px', background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {stats.map(([emoji, label, count]) => (
              <tr key={label}>
                <td
                  style={{
                    color: '#888',
                    fontSize: '11px',
                    padding: '2px 8px 2px 0',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                  }}
                >
                  {emoji} {label}
                </td>
                <td
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    textAlign: 'right',
                  }}
                >
                  {count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * PrefectureLayer — Renders prefecture (ADM2) polygon fill layer.
 *
 * Fetches `/data/prefecture_synthesis.geojson` (37 préfectures) and renders
 * each as a filled GeoJSON polygon via Leaflet's imperative API.
 *
 * Placed in a custom pane (z-index 350): above the OSM basemap (z=200),
 * below the analysis overlay-pane layers (z=400), and below markers (z=600).
 *
 * When `selectedPrefecture` is set, the matching feature is highlighted with
 * a Togo Heritage yellow border (#FFD100) without rebuilding the entire layer.
 *
 * Must be rendered inside a <MapContainer> (react-leaflet context required).
 */
export default function PrefectureLayer({ selectedPrefecture }: PrefectureLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const { data } = useDataLoader(PREFECTURE_DATA_URL);

  /**
   * Keep a ref to the latest selectedPrefecture so that the stable style
   * function used during layer creation can read the current value without
   * being listed as a dependency (which would rebuild the layer on every change).
   */
  const selectedPrefRef = useRef<string | undefined>(selectedPrefecture);

  // ── Effect 1: re-style on selectedPrefecture change (no layer rebuild) ──
  useEffect(() => {
    // Update ref FIRST so the style function reads the correct value
    selectedPrefRef.current = selectedPrefecture;

    if (!layerRef.current) return;

    layerRef.current.setStyle((feature) => {
      const props = feature?.properties as PrefectureProperties | undefined;
      const sel = selectedPrefRef.current;
      if (sel && props?.nom_prefecture === sel) {
        return {
          weight: 3,
          color: SELECTED_COLOR,
          fillOpacity: 0.35,
          dashArray: '',
          fillColor: props?.color ?? '#aaaaaa',
        };
      }
      return {
        fillColor: props?.color ?? '#aaaaaa',
        weight: 1,
        color: '#666',
        fillOpacity: 0.6,
      };
    });
  }, [selectedPrefecture]);

  // ── Effect 2: create / destroy layer when data loads ──────────────────
  useEffect(() => {
    // ── 1. Ensure the custom pane exists (created once per map instance) ──
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

    // ── 3. Build the GeoJSON polygon layer ────────────────────────────────
    // Cast: GeoJsonFeatureCollection → GeoJSON.GeoJsonObject (structurally compatible)
    const geoJsonLayer = L.geoJSON(
      data as unknown as Parameters<typeof L.geoJSON>[0],
      {
        pane: PANE_NAME,

        // Style reads from selectedPrefRef so it's stable across re-renders
        style: (feature) => {
          const props = feature?.properties as PrefectureProperties | undefined;
          const sel = selectedPrefRef.current;
          if (sel && props?.nom_prefecture === sel) {
            return {
              weight: 3,
              color: SELECTED_COLOR,
              fillOpacity: 0.35,
              dashArray: '',
              fillColor: props?.color ?? '#aaaaaa',
            };
          }
          return {
            fillColor: props?.color ?? '#aaaaaa',
            weight: 1,
            color: '#666',
            fillOpacity: 0.6,
          };
        },

        onEachFeature: (feature, layer) => {
          const props = feature.properties as PrefectureProperties;

          // Bind popup (HTML rendered outside React tree via renderToString)
          const popupHtml = renderToString(<PrefecturePopup props={props} />);
          layer.bindPopup(popupHtml, {
            maxWidth: 280,
            className: 'agrimap-popup',
          });

          // Hover: highlight prefecture border
          layer.on('mouseover', () => {
            (layer as L.Path).setStyle({ weight: 2, color: '#333' });
          });

          // Mouseout: restore default/selection style via resetStyle
          // resetStyle calls the original options.style function which reads selectedPrefRef
          layer.on('mouseout', () => {
            geoJsonLayer.resetStyle(layer as L.Layer);
          });

          // Click: open popup (fires when no higher-z-index polygon intercepts)
          layer.on('click', (e: L.LeafletMouseEvent) => {
            (layer as L.Path).setStyle({ weight: 2, color: '#333' });
            layer.openPopup(e.latlng);
          });
        },
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
