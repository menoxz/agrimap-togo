import { type ReactNode } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Default center for Togo.
 */
export const TOGO_CENTER: [number, number] = [8.5, 1.0];
export const TOGO_ZOOM = 7;
export const TOGO_MAX_BOUNDS: [[number, number], [number, number]] = [
  [5.5, -1.0],
  [11.5, 2.5],
];

interface TogoMapProps {
  center?: [number, number];
  zoom?: number;
  children?: ReactNode;
  className?: string;
  scrollWheelZoom?: boolean;
}

/**
 * TogoMap — Core Leaflet map component.
 * Renders a full-height map centered on Togo with OSM basemap.
 * Wraps MapContainer from react-leaflet with sensible defaults.
 */
export default function TogoMap({
  center = TOGO_CENTER,
  zoom = TOGO_ZOOM,
  children,
  className = '',
  scrollWheelZoom = true,
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

      <ZoomControl position="bottomright" />

      {children}
    </MapContainer>
  );
}
