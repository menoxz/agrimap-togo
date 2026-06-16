import { ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { TOGO_CENTER, TOGO_ZOOM } from './TogoMap';

interface MapControllerProps {
  onLegendToggle?: () => void;
}

/**
 * MapController — Zoom and recenter controls rendered inside the Leaflet map.
 * Positioned as an overlay on the map using Leaflet's control pattern.
 * Uses useMap() hook to access the Leaflet map instance.
 */
export default function MapController({ onLegendToggle }: MapControllerProps) {
  // We render inside a Leaflet container by using the map context
  return <MapControlInner onLegendToggle={onLegendToggle} />;
}

function MapControlInner({ onLegendToggle }: MapControllerProps) {
  const map = useMap();

  const zoomIn = () => {
    map.zoomIn();
  };

  const zoomOut = () => {
    map.zoomOut();
  };

  const recenter = () => {
    map.setView(TOGO_CENTER, TOGO_ZOOM, { animate: true });
  };

  return (
    <div className="leaflet-bottom leaflet-left" style={{ marginBottom: '20px', marginLeft: '10px' }}>
      <div className="leaflet-control leaflet-bar flex flex-col gap-0.5">
        <button
          onClick={zoomIn}
          className="flex items-center justify-center w-[34px] h-[34px] bg-white text-text-secondary hover:text-text hover:bg-gray-50 border border-border shadow-sm rounded-t-md transition-colors cursor-pointer"
          aria-label="Zoom avant"
          title="Zoom avant"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={zoomOut}
          className="flex items-center justify-center w-[34px] h-[34px] bg-white text-text-secondary hover:text-text hover:bg-gray-50 border border-border shadow-sm transition-colors cursor-pointer"
          aria-label="Zoom arrière"
          title="Zoom arrière"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={recenter}
          className="flex items-center justify-center w-[34px] h-[34px] bg-white text-text-secondary hover:text-text hover:bg-gray-50 border border-border shadow-sm rounded-b-md transition-colors cursor-pointer"
          aria-label="Recentrer sur le Togo"
          title="Recentrer sur le Togo"
        >
          <Crosshair size={16} />
        </button>
      </div>
    </div>
  );
}
