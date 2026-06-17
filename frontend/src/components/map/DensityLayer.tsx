import { renderToString } from 'react-dom/server';
import DataLayer from './DataLayer';
import PrefecturePopup from './PrefecturePopup';
import { CB_DENSITY } from '@/utils/colors';
import type { GeoJsonFeature } from '@/types/map';
import type L from 'leaflet';

const DATA_URL = '/data/analysis/density_prefecture.geojson';

const CLASS_BREAKS = [
  { min: 0, max: 8, color: CB_DENSITY[0], label: 'Très faible' },
  { min: 8, max: 15, color: CB_DENSITY[1], label: 'Faible' },
  { min: 15, max: 25, color: CB_DENSITY[2], label: 'Moyen' },
  { min: 25, max: 40, color: CB_DENSITY[3], label: 'Élevé' },
  { min: 40, max: 100, color: CB_DENSITY[4], label: 'Très élevé' },
];

function getColor(density: number): string {
  for (const cls of CLASS_BREAKS) {
    if (density >= cls.min && density < cls.max) return cls.color;
  }
  return CB_DENSITY[0];
}

interface DensityLayerProps {
  visible?: boolean;
  regionFilter?: string;
  /** Called when a prefecture is clicked */
  onPrefectureClick?: (nomPrefecture: string, properties: Record<string, any>) => void;
}

export { CLASS_BREAKS as DENSITY_CLASS_BREAKS };

/**
 * DensityLayer — Choropleth map of farm density per region.
 * Uses ColorBrewer YlOrBr palette (5 classes).
 * Shows popup with region name, density, and exploitation count.
 */
export default function DensityLayer({ visible = true, regionFilter, onPrefectureClick }: DensityLayerProps) {
  const handleStyle = (feature: GeoJsonFeature) => {
    const cls = ((feature.properties.density_class as number) ?? 1) - 1;
    return {
      fillColor: CB_DENSITY[Math.min(cls, 4)],
      weight: 1.5,
      opacity: 0.9,
      color: '#666',
      fillOpacity: 0.75,
    };
  };

  const handleEachFeature = (feature: GeoJsonFeature, layer: L.Layer) => {
    const props = feature.properties;
    const prefectureName = (props.nom_prefecture as string) ?? '';

    const popupContent = renderToString(
      <PrefecturePopup
        properties={props}
        analysisType="density"
        accentColor="#D95F0E"
      />,
    );

    layer.bindPopup(popupContent, {
      maxWidth: 320,
      className: 'custom-popup',
    });

    if (onPrefectureClick) {
      layer.on('click', () => {
        onPrefectureClick(prefectureName, props);
      });
    }

    layer.on('mouseover', (e) => {
      const target = e.target;
      target.setStyle({ weight: 2.5, fillOpacity: 0.9 });
      if (!target._map) return;
      target.bringToFront();
    });

    layer.on('mouseout', (e) => {
      const target = e.target;
      target.setStyle({ weight: 1.5, fillOpacity: 0.75 });
    });
  };

  return (
    <DataLayer
      url={DATA_URL}
      layerId="density"
      visible={visible}
      regionFilter={regionFilter}
      style={handleStyle}
      onEachFeature={handleEachFeature}
      attribution="Densité exploitations © AgriMap Togo"
    />
  );
}
