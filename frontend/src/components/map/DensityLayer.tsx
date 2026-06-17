import { renderToString } from 'react-dom/server';
import DataLayer from './DataLayer';
import RegionPopup from './RegionPopup';
import { CB_DENSITY } from '@/utils/colors';
import type { GeoJsonFeature } from '@/types/map';
import type L from 'leaflet';

const DATA_URL = '/data/density.geojson';

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
}

export { CLASS_BREAKS as DENSITY_CLASS_BREAKS };

/**
 * DensityLayer — Choropleth map of farm density per region.
 * Uses ColorBrewer YlOrBr palette (5 classes).
 * Shows popup with region name, density, and exploitation count.
 */
export default function DensityLayer({ visible = true, regionFilter }: DensityLayerProps) {
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
    const density = (props.density as number) ?? 0;
    const exploitations = (props.exploitations as number) ?? 0;
    const densityLabel = (props.density_label as string) ?? '';
    const densityClass = (props.density_class as number) ?? 1;

    const indicators: Array<{ label: string; value: string | number; unit?: string }> = [
      { label: 'Densité', value: density.toFixed(4), unit: 'expl./km²' },
      { label: 'Classe', value: densityLabel },
      { label: 'Rang', value: densityClass },
      { label: 'Exploitations', value: exploitations },
    ];

    const popupContent = renderToString(
      <RegionPopup
        properties={props}
        indicators={indicators}
        accentColor="#D95F0E"
      />,
    );

    layer.bindPopup(popupContent, {
      maxWidth: 320,
      className: 'custom-popup',
    });

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
