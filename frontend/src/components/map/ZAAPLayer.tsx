import { renderToString } from 'react-dom/server';
import DataLayer from './DataLayer';
import RegionPopup from './RegionPopup';
import { CB_ZAAP } from '@/utils/colors';
import type { GeoJsonFeature } from '@/types/map';
import type L from 'leaflet';

const DATA_URL = '/data/zaap_coverage.geojson';

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
}: ZAAPLayerProps) {
  const handleStyle = (feature: GeoJsonFeature) => {
    const coverage = (feature.properties.coverage_pct as number) ?? 0;
    const nonCovered = feature.properties.non_covered === true;
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
    const coverage = (props.coverage_pct as number) ?? 0;
    const zaapCount = (props.zaap_count as number) ?? 0;
    const statut = (props.statut as string) ?? 'non_couvert';

    const indicators: Array<{ label: string; value: string | number; unit?: string }> = [
      { label: 'Couverture ZAAP', value: coverage, unit: '%' },
      { label: 'Sites ZAAP', value: zaapCount },
      { label: 'Statut', value: statut },
    ];

    const popupContent = renderToString(
      <RegionPopup
        properties={props}
        indicators={indicators}
        accentColor={coverage > 40 ? '#1B7837' : '#E65100'}
      />,
    );

    layer.bindPopup(popupContent, {
      maxWidth: 320,
      className: 'custom-popup',
    });

    layer.on('mouseover', (e) => {
      e.target.setStyle({ weight: 2.5, fillOpacity: 0.9 });
      e.target.bringToFront();
    });
    layer.on('mouseout', (e) => {
      e.target.setStyle({ weight: 1.5, fillOpacity: 0.75 });
    });
  };

  const filterFn = onlyUncovered
    ? (f: GeoJsonFeature) => f.properties.non_covered === true
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
