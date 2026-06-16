import { renderToString } from 'react-dom/server';
import DataLayer from './DataLayer';
import RegionPopup from './RegionPopup';
import { CB_COOP } from '@/utils/colors';
import type { GeoJsonFeature } from '@/types/map';
import type L from 'leaflet';

const DATA_URL = '/data/cooperative_network.geojson';

const CLASS_BREAKS = [
  { min: 0, max: 2, color: '#FFF5E6', label: 'Très faible' },
  { min: 2, max: 5, color: CB_COOP[1], label: 'Faible' },
  { min: 5, max: 10, color: CB_COOP[2], label: 'Modéré' },
  { min: 10, max: 20, color: CB_COOP[3], label: 'Dense' },
];

function getColor(density: number): string {
  for (const cls of CLASS_BREAKS) {
    if (density >= cls.min && density < cls.max) return cls.color;
  }
  return CB_COOP[3];
}

interface CoopLayerProps {
  visible?: boolean;
  regionFilter?: string;
}

export { CLASS_BREAKS as COOP_CLASS_BREAKS };

/**
 * CoopLayer — Cooperative network density map.
 * Uses ColorBrewer OrRd palette. Highlights "white zones" (no cooperatives).
 * Shows popup with cooperative count and density.
 */
export default function CoopLayer({
  visible = true,
  regionFilter,
}: CoopLayerProps) {
  const handleStyle = (feature: GeoJsonFeature) => {
    const density = (feature.properties.coop_density as number) ?? 0;
    const isWhiteZone = feature.properties.zone_blanche === true;
    return {
      fillColor: isWhiteZone ? '#FFE0B2' : getColor(density),
      weight: 1.5,
      opacity: 0.9,
      color: isWhiteZone ? '#D7301F' : '#666',
      fillOpacity: isWhiteZone ? 0.5 : 0.75,
    };
  };

  const handleEachFeature = (feature: GeoJsonFeature, layer: L.Layer) => {
    const props = feature.properties;
    const coopCount = (props.coop_count as number) ?? 0;
    const coopDensity = (props.coop_density as number) ?? 0;
    const members = (props.members_total as number) ?? 0;
    const isWhiteZone = props.zone_blanche === true;

    const indicators: Array<{ label: string; value: string | number; unit?: string }> = [
      { label: 'Coopératives', value: coopCount },
      { label: 'Densité coop.', value: coopDensity, unit: '/100k' },
      { label: 'Membres', value: members },
    ];

    if (isWhiteZone) {
      indicators.push({ label: 'Zone blanche', value: '⚠️ Oui' });
    }

    const popupContent = renderToString(
      <RegionPopup
        properties={props}
        indicators={indicators}
        accentColor={isWhiteZone ? '#D7301F' : '#FC8D59'}
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

  return (
    <DataLayer
      url={DATA_URL}
      layerId="coop"
      visible={visible}
      regionFilter={regionFilter}
      style={handleStyle}
      onEachFeature={handleEachFeature}
      attribution="Réseau coopératif © AgriMap Togo"
    />
  );
}
