import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export interface MapFlyToProps {
  /** Target coordinates [lat, lng] to fly to. If null, no fly. */
  target: [number, number] | null;
  /** Zoom level after fly (default: 8) */
  zoom?: number;
  /** Duration of the fly animation in seconds (default: 1.5) */
  duration?: number;
}

/**
 * MapFlyTo — Imperative map fly-to using react-leaflet hook.
 * When `target` changes to a non-null value, the map flies to the given
 * coordinates at the specified zoom level and duration.
 */
export function MapFlyTo({ target, zoom = 8, duration = 1.5 }: MapFlyToProps) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo(target, zoom, { duration });
  }, [target, zoom, duration, map]);

  return null;
}
