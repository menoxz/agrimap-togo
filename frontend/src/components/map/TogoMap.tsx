import { type ReactNode } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkersLayer, { type MarkerType } from './MarkersLayer';
import PrefectureLayer from './PrefectureLayer';

/**
 * Default center for Togo.
 */
export const TOGO_CENTER: [number, number] = [8.5, 1.0];
export const TOGO_ZOOM = 7;
export const TOGO_MAX_BOUNDS: [[number, number], [number, number]] = [
  [5.5, -1.0],
  [11.5, 2.5],
];

/** All supported marker overlay types. */
const ALL_MARKER_TYPES: readonly MarkerType[] = [
  'marches',
  'cooperatives',
  'exploitations',
  'zaap',
  'pepinieres',
];

interface TogoMapProps {
  center?: [number, number];
  zoom?: number;
  children?: ReactNode;
  className?: string;
  scrollWheelZoom?: boolean;
  /** Set of marker types to display. Each visible type renders a MarkersLayer. */
  visibleMarkers?: Set<string>;
  /**
   * When true, renders the PrefectureLayer (ADM2 polygon overlay).
   * The prefecture layer is placed below analysis layers (overlay-pane z=400)
   * and well below markers (marker-pane z=600).
   */
  showPrefectures?: boolean;
  /**
   * Filter markers to show only this prefecture (title-case, e.g. "Kozah").
   * Passed to every MarkersLayer. '' or undefined = show all.
   */
  prefectureFilter?: string;
  /**
   * Currently selected prefecture — highlighted with Togo Heritage yellow.
   * Passed to PrefectureLayer.
   */
  selectedPrefecture?: string;
}

/**
 * TogoMap — Core Leaflet map component.
 * Renders a full-height map centered on Togo with OSM basemap.
 * Wraps MapContainer from react-leaflet with sensible defaults.
 *
 * Pass `visibleMarkers` to show point/polygon overlays for
 * marchés, coopératives, ZAAP, or pépinières.
 */
export default function TogoMap({
  center = TOGO_CENTER,
  zoom = TOGO_ZOOM,
  children,
  className = '',
  scrollWheelZoom = true,
  visibleMarkers,
  showPrefectures = false,
  prefectureFilter,
  selectedPrefecture,
}: TogoMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      maxBounds={TOGO_MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={6}
      zoomControl={false}
      scrollWheelZoom={scrollWheelZoom}
      className={`h-full w-full z-0 ${className}`}
      style={{ minHeight: '300px', background: '#f0f0e8' }}
    >
      {/* OpenStreetMap basemap — no API key needed */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Prefecture polygon layer — custom pane z=350, below analysis layers */}
      {showPrefectures && <PrefectureLayer selectedPrefecture={selectedPrefecture} />}

      <ZoomControl position="bottomright" />

      {/* Marker overlays — rendered for each visible type */}
      {visibleMarkers &&
        ALL_MARKER_TYPES.filter((t) => visibleMarkers.has(t)).map((t) => (
          <MarkersLayer key={t} type={t} prefectureFilter={prefectureFilter} />
        ))}

      {children}
    </MapContainer>
  );
}
