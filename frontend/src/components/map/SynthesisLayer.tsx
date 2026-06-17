import { renderToString } from 'react-dom/server';
import DataLayer from './DataLayer';
import RegionPopup from './RegionPopup';
import { CB_SYNTHESIS } from '@/utils/colors';
import type { GeoJsonFeature, GeoJsonPropertyMap } from '@/types/map';
import type L from 'leaflet';

const DATA_URL = '/data/synthesis.geojson';

const CLASS_BREAKS = [
  { min: 0, max: 0.2, color: CB_SYNTHESIS[0], label: 'Priorité maximale', priority: 1 },
  { min: 0.2, max: 0.4, color: CB_SYNTHESIS[1], label: 'Prioritaire', priority: 2 },
  { min: 0.4, max: 0.6, color: CB_SYNTHESIS[2], label: 'Surveillance', priority: 3 },
  { min: 0.6, max: 0.8, color: CB_SYNTHESIS[3], label: 'Bien desservi', priority: 4 },
  { min: 0.8, max: 1, color: CB_SYNTHESIS[4], label: 'Très bien desservi', priority: 5 },
];

function getColor(score: number): string {
  for (const cls of CLASS_BREAKS) {
    if (score >= cls.min && score < cls.max) return cls.color;
  }
  return CB_SYNTHESIS[4];
}

interface ZoneClickData {
  properties: GeoJsonPropertyMap;
  center: [number, number];
}

interface SynthesisLayerProps {
  visible?: boolean;
  regionFilter?: string;
  /** Called when a zone is clicked — provides properties + map center coordinates */
  onZoneClick?: (data: ZoneClickData) => void;
}

export { CLASS_BREAKS as SYNTHESIS_CLASS_BREAKS };

/**
 * SynthesisLayer — Composite prioritization map.
 * Uses diverging ColorBrewer RdYlGn palette (5 classes).
 * Shows popup with composite score, rank, and sub-scores.
 */
export default function SynthesisLayer({
  visible = true,
  regionFilter,
  onZoneClick,
}: SynthesisLayerProps) {
  const handleStyle = (feature: GeoJsonFeature) => {
    const score = ((feature.properties.synthesis_score as number) ?? 0) / 100;
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
    const score = (props.synthesis_score as number) ?? 0;
    const rank = (props.synthesis_class as number) ?? 0;
    const priorite = (props.priority_level as string) ?? '';
    const densityScore = (props.density_score as number) ?? 0;
    const coopCount = (props.coop_count as number) ?? 0;
    const avgDistance = (props.avg_distance_km as number) ?? 0;

    const indicators: Array<{ label: string; value: string | number; unit?: string }> = [
      { label: 'Score composite', value: score.toFixed(1), unit: '/100' },
      { label: 'Rang priorité', value: rank },
      { label: 'Priorité', value: priorite },
      { label: 'Densité', value: densityScore.toFixed(1), unit: '/100' },
      { label: 'Coopératives', value: coopCount },
      { label: 'Distance moy.', value: avgDistance.toFixed(2), unit: 'km' },
    ];

    const popupContent = renderToString(
      <RegionPopup
        properties={props}
        indicators={indicators}
        accentColor={score < 40 ? '#D73027' : score < 60 ? '#FEE08B' : '#1A9850'}
      />,
    );

    layer.bindPopup(popupContent, {
      maxWidth: 340,
      className: 'custom-popup',
    });

    layer.on('click', (e) => {
      // Compute polygon center from bounds for flyTo
      const polygon = e.target;
      let center: [number, number] = [8.5, 1.0]; // fallback to Togo center
      try {
        if (typeof polygon.getBounds === 'function') {
          const bounds = polygon.getBounds();
          center = [bounds.getCenter().lat, bounds.getCenter().lng];
        }
      } catch {
        // use fallback
      }
      onZoneClick?.({ properties: props, center });
    });

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
      layerId="synthesis"
      visible={visible}
      regionFilter={regionFilter}
      style={handleStyle}
      onEachFeature={handleEachFeature}
      attribution="Synthèse priorisation © AgriMap Togo"
    />
  );
}
