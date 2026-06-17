import { renderToString } from 'react-dom/server';
import DataLayer from './DataLayer';
import PrefecturePopup from './PrefecturePopup';
import { CB_ACCESS } from '@/utils/colors';
import type { GeoJsonFeature } from '@/types/map';
import type L from 'leaflet';

const DATA_URL = '/data/analysis/accessibility_prefecture.geojson';

const CLASS_BREAKS = [
  { min: 0, max: 0.2, color: CB_ACCESS[4], label: 'Isolé' },
  { min: 0.2, max: 0.4, color: CB_ACCESS[3], label: 'Peu accessible' },
  { min: 0.4, max: 0.6, color: CB_ACCESS[2], label: 'Modéré' },
  { min: 0.6, max: 0.8, color: CB_ACCESS[1], label: 'Accessible' },
  { min: 0.8, max: 1, color: CB_ACCESS[0], label: 'Très accessible' },
];

function getColor(score: number): string {
  for (const cls of CLASS_BREAKS) {
    if (score >= cls.min && score < cls.max) return cls.color;
  }
  return CB_ACCESS[4];
}

interface AccessibilityLayerProps {
  visible?: boolean;
  regionFilter?: string;
  /** Called when a prefecture is clicked */
  onPrefectureClick?: (nomPrefecture: string, properties: Record<string, any>) => void;
}

export { CLASS_BREAKS as ACCESS_CLASS_BREAKS };

/**
 * AccessibilityLayer — Market access map.
 * Uses ColorBrewer BuPu palette (5 classes).
 * Shows popup with distance and time to nearest market.
 */
export default function AccessibilityLayer({
  visible = true,
  regionFilter,
  onPrefectureClick,
}: AccessibilityLayerProps) {
  const handleStyle = (feature: GeoJsonFeature) => {
    const score = ((feature.properties.accessibility_score as number) ?? 0) / 100;
    return {
      fillColor: getColor(score),
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
        analysisType="access"
        accentColor="#756BB1"
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
      e.target.setStyle({ weight: 2.5, fillOpacity: 0.9 });
      e.target.bringToFront();
    });
    layer.on('mouseout', (e) => {
      e.target.setStyle({ weight: 1.5, fillOpacity: 0.75 });
    });
  };

  return (
    <DataLayer
      url={DATA_URL}
      layerId="access"
      visible={visible}
      regionFilter={regionFilter}
      style={handleStyle}
      onEachFeature={handleEachFeature}
      attribution="Accessibilité marchés © AgriMap Togo"
    />
  );
}
