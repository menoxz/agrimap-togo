import { renderToString } from 'react-dom/server';
import DataLayer from './DataLayer';
import PrefecturePopup from './PrefecturePopup';
import { CB_ZAAP } from '@/utils/colors';
import type { GeoJsonFeature } from '@/types/map';
import type L from 'leaflet';

const DATA_URL = '/data/analysis/zaap_coverage_prefecture.geojson';

const CLASS_BREAKS = [
  { min: 0, max: 15, color: '#FF8C00', label: 'Non couvert', highlight: true },
  { min: 15, max: 40, color: CB_ZAAP[1], label: 'Partiel' },
  { min: 40, max: 70, color: CB_ZAAP[2], label: 'Couvert' },
  { min: 70, max: 100, color: CB_ZAAP[3], label: 'Bien couvert' },
];

function getColor(coverage: number, nonCovered?: boolean): string {
  if (nonCovered) return '#FF8C00';
  for (const cls of CLASS_BREAKS) {
    if (coverage >= cls.min && coverage < cls.max) return cls.color;
  }
  return CB_ZAAP[0];
}

interface ZAAPLayerProps {
  visible?: boolean;
  regionFilter?: string;
  /** When true, only show uncovered regions with orange accent */
  onlyUncovered?: boolean;
  /** Called when a prefecture is clicked */
  onPrefectureClick?: (nomPrefecture: string, properties: Record<string, any>) => void;
}

export { CLASS_BREAKS as ZAAP_CLASS_BREAKS };

/**
 * ZAAPLayer — ZAAP coverage map.
 * Uses ColorBrewer Greens palette. Uncovered areas get an orange accent.
 * Shows popup with coverage percentage and ZAAP site count.
 */
export default function ZAAPLayer({
  visible = true,
  regionFilter,
  onlyUncovered = false,
  onPrefectureClick,
}: ZAAPLayerProps) {
  const handleStyle = (feature: GeoJsonFeature) => {
    const coverage = (feature.properties.coverage_pct as number) ?? 0;
    const nonCovered = (feature.properties.coverage_pct as number) === 0;
    const color = getColor(coverage, nonCovered);
    return {
      fillColor: color,
      weight: 1.5,
      opacity: 0.9,
      color: nonCovered ? '#CC7000' : '#666',
      fillOpacity: nonCovered ? 0.85 : 0.75,
    };
  };

  const handleEachFeature = (feature: GeoJsonFeature, layer: L.Layer) => {
    const props = feature.properties;
    const prefectureName = (props.nom_prefecture as string) ?? '';

    const popupContent = renderToString(
      <PrefecturePopup
        properties={props}
        analysisType="zaap"
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

  const filterFn = onlyUncovered
    ? (f: GeoJsonFeature) => (f.properties.coverage_pct as number) === 0
    : undefined;

  return (
    <DataLayer
      url={DATA_URL}
      layerId="zaap"
      visible={visible}
      regionFilter={regionFilter}
      style={handleStyle}
      onEachFeature={handleEachFeature}
      filter={filterFn}
      attribution="Couverture ZAAP © AgriMap Togo"
    />
  );
}
