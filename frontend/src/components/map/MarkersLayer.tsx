import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { useDataLoader } from '@/hooks/useDataLoader';
import type { GeoJsonFeature, GeoJsonPropertyMap } from '@/types/map';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MarkerType = 'marches' | 'cooperatives' | 'exploitations' | 'zaap' | 'pepinieres';

interface MarkersLayerProps {
  type: MarkerType;
  /** Filter markers to only show this prefecture ('' or undefined = show all). */
  prefectureFilter?: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DATA_URLS: Record<MarkerType, string> = {
  marches:       '/data/marches.geojson',
  cooperatives:  '/data/cooperatives.geojson',
  exploitations: '/data/exploitations.geojson',
  zaap:          '/data/zaap_formes.geojson',
  pepinieres:    '/data/pepinieres.geojson',
};

interface IconConfig {
  emoji: string;
  bg: string;
  border: string;
  textDark: boolean; // true = dark text on light background
}

const ICON_CONFIG: Record<MarkerType, IconConfig> = {
  marches:       { emoji: '🛒', bg: '#FFC107', border: '#F57F17', textDark: true  },
  cooperatives:  { emoji: '🤝', bg: '#4CAF50', border: '#1B5E20', textDark: false },
  exploitations: { emoji: '🌾', bg: '#8B5E3C', border: '#4E3427', textDark: false },
  zaap:          { emoji: '🌱', bg: '#2196F3', border: '#0D47A1', textDark: false },
  pepinieres:    { emoji: '🌿', bg: '#8BC34A', border: '#33691E', textDark: false },
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function getLatLng(feature: GeoJsonFeature): [number, number] | null {
  const { type, coordinates } = feature.geometry;

  if (type === 'Point') {
    const c = coordinates as number[];
    return [c[1], c[0]]; // [lat, lng]
  }

  if (type === 'Polygon') {
    const ring = (coordinates as number[][][])[0];
    if (!ring?.length) return null;
    let sumLat = 0, sumLng = 0;
    for (const [lng, lat] of ring) { sumLat += lat; sumLng += lng; }
    return [sumLat / ring.length, sumLng / ring.length];
  }

  if (type === 'MultiPolygon') {
    const allPts = (coordinates as number[][][][]).flatMap((p) => p[0] ?? []);
    if (!allPts.length) return null;
    let sumLat = 0, sumLng = 0;
    for (const [lng, lat] of allPts) { sumLat += lat; sumLng += lng; }
    return [sumLat / allPts.length, sumLng / allPts.length];
  }

  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format a numeric value intelligently:
 * - 0 → "0"
 * - 0.5 → "0.5" (not "0.50")
 * - 1 → "1" (not "1.00")
 * - 1.23 → "1.23"
 * Strips trailing zeros while keeping up to `decimals` precision.
 */
function fmtNum(value: number | string | boolean | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  const n = Number(value)
  if (isNaN(n)) return String(value)
  if (n === 0) return '0'
  return parseFloat(n.toFixed(decimals)).toString()
}

// ─── Popup components — NO hooks (renderToString only) ───────────────────────

interface PopupRowProps {
  label: string;
  value: string | number | null | undefined;
}

function PopupRow({ label, value }: PopupRowProps) {
  if (value == null || value === '') return null;
  return (
    <tr>
      <td
        style={{
          color: '#888',
          fontSize: '11px',
          padding: '2px 10px 2px 0',
          whiteSpace: 'nowrap',
          verticalAlign: 'top',
        }}
      >
        {label}
      </td>
      <td style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a' }}>
        {String(value)}
      </td>
    </tr>
  );
}

interface MarkerPopupProps {
  type: MarkerType;
  props: GeoJsonPropertyMap;
}

function MarkerPopup({ type, props }: MarkerPopupProps) {
  const { emoji, bg, textDark } = ICON_CONFIG[type];

  let title = '';
  let rows: (React.ReactElement | null)[] = [];

  const coordStr =
    props['lon'] != null && props['lat'] != null
      ? `${Number(props['lat']).toFixed(4)}, ${Number(props['lon']).toFixed(4)}`
      : null;

  if (type === 'marches') {
    // Fields: id, nom, type, source, lon, lat, prefecture, region
    title = String(props['nom'] ?? `Marché #${props['id']}`);
    rows = [
      <PopupRow key="id"     label="ID"          value={props['id'] as string} />,
      <PopupRow key="type"   label="Type"        value={props['type'] as string} />,
      <PopupRow key="src"    label="Source"      value={props['source'] as string} />,
      <PopupRow key="pref"   label="Préfecture"  value={props['prefecture'] as string} />,
      <PopupRow key="reg"    label="Région"      value={props['region'] as string} />,
      <PopupRow key="coord"  label="Coordonnées" value={coordStr} />,
    ];
  } else if (type === 'cooperatives') {
    // Fields: id, nom, type, source, lon, lat, prefecture, region
    title = String(props['nom'] ?? `Coopérative #${props['id']}`);
    rows = [
      <PopupRow key="id"     label="ID"          value={props['id'] as string} />,
      <PopupRow key="type"   label="Type"        value={props['type'] as string} />,
      <PopupRow key="src"    label="Source"      value={props['source'] as string} />,
      <PopupRow key="pref"   label="Préfecture"  value={props['prefecture'] as string} />,
      <PopupRow key="reg"    label="Région"      value={props['region'] as string} />,
      <PopupRow key="coord"  label="Coordonnées" value={coordStr} />,
    ];
  } else if (type === 'exploitations') {
    // Fields: id, type="farmland", area_ha, source, lon, lat, prefecture (no nom, no region)
    const area = props['area_ha'] != null ? `${fmtNum(props['area_ha'])} ha` : null;
    title = `Exploitation #${props['id']}`;
    rows = [
      <PopupRow key="id"     label="ID"          value={props['id'] as string} />,
      <PopupRow key="type"   label="Type"        value={props['type'] as string} />,
      <PopupRow key="area"   label="Superficie"  value={area} />,
      <PopupRow key="src"    label="Source"      value={props['source'] as string} />,
      <PopupRow key="pref"   label="Préfecture"  value={props['prefecture'] as string} />,
      <PopupRow key="coord"  label="Coordonnées" value={coordStr} />,
    ];
  } else if (type === 'zaap') {
    title = String(props['nom_zaap'] ?? 'ZAAP');
    const sup = props['superficie_ha'] != null ? `${fmtNum(props['superficie_ha'])} ha` : null;
    rows = [
      <PopupRow key="type" label="Type"        value={props['type_zaap'] as string} />,
      <PopupRow key="stat" label="Statut"      value={props['statut'] as string} />,
      <PopupRow key="sup"  label="Superficie"  value={sup} />,
      <PopupRow key="exp"  label="Exploitants" value={props['nombre_exploitants'] as number} />,
      <PopupRow key="reg"  label="Région"      value={props['region'] as string} />,
    ];
  } else {
    // pepinieres
    title = String(props['nom_pepiniere'] ?? 'Pépinière');
    const cap = props['capacite_plants'] != null
      ? `${Number(props['capacite_plants']).toLocaleString('fr-FR')} plants`
      : null;
    rows = [
      <PopupRow key="type" label="Type"     value={props['type_pepiniere'] as string} />,
      <PopupRow key="cap"  label="Capacité" value={cap} />,
      <PopupRow key="esp"  label="Espèces"  value={props['especes_principales'] as string} />,
      <PopupRow key="reg"  label="Région"   value={props['region'] as string} />,
    ];
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minWidth: '180px',
        maxWidth: '250px',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: bg,
          color: textDark ? '#1a1a1a' : '#fff',
          padding: '7px 10px',
          fontWeight: 700,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '14px' }}>{emoji}</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
          }}
        >
          {title}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px', background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Build divIcon HTML ───────────────────────────────────────────────────────

function buildDivIconHtml(cfg: IconConfig): string {
  return (
    `<div style="` +
    `width:28px;height:28px;` +
    `background:${cfg.bg};` +
    `border:2px solid ${cfg.border};` +
    `border-radius:50%;` +
    `display:flex;align-items:center;justify-content:center;` +
    `font-size:15px;line-height:1;` +
    `box-shadow:0 2px 5px rgba(0,0,0,0.35);` +
    `cursor:pointer;` +
    `">${cfg.emoji}</div>`
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * MarkersLayer — Renders individual Leaflet markers for a given data type.
 * Uses L.divIcon with emoji for differentiated icons and renderToString for popups.
 * Must be rendered inside a MapContainer (react-leaflet context required).
 */
export default function MarkersLayer({ type, prefectureFilter }: MarkersLayerProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const { data } = useDataLoader(DATA_URLS[type]);

  useEffect(() => {
    // Clean up previous layer group
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    if (!data?.features?.length) return;

    const cfg = ICON_CONFIG[type];
    const icon = L.divIcon({
      className: '',
      html: buildDivIconHtml(cfg),
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });

    const group = L.layerGroup();

    for (const feature of data.features) {
      // ── Prefecture filter ──────────────────────────────────────────────
      if (prefectureFilter && feature.properties.prefecture !== prefectureFilter) continue;

      const latlng = getLatLng(feature);
      if (!latlng) continue;

      const popupHtml = renderToString(
        <MarkerPopup type={type} props={feature.properties} />,
      );

      const marker = L.marker(latlng, { icon });
      marker.bindPopup(popupHtml, { maxWidth: 260, className: 'agrimap-popup' });
      group.addLayer(marker);
    }

    group.addTo(map);
    layerGroupRef.current = group;

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [data, map, type, prefectureFilter]);

  // No DOM output — all rendering is via Leaflet's imperative API
  return null;
}
