import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/utils/formatters';

interface RegionPopupProps {
  properties: Record<string, string | number | boolean | null | undefined>;
  /** Analysis-specific indicator fields to show */
  indicators?: Array<{
    label: string;
    value: string | number;
    unit?: string;
    decimals?: number;
  }>;
  /** Color for the accent bar */
  accentColor?: string;
}

/**
 * RegionPopup — Rich popup content for region features.
 * Shows region name (from properties), key indicators, and an action link.
 * The region name uses bilingual keys via the properties `region` field.
 */
export default function RegionPopup({
  properties,
  indicators,
  accentColor = '#1B5E20',
}: RegionPopupProps) {
  const { t } = useTranslation();
  const regionName =
    (properties.nom_region as string) || (properties.region as string) || '';

  // Build indicators from properties if not provided explicitly
  const displayIndicators = indicators ?? buildIndicators(properties, t);

  return (
    <div className="leaflet-popup-custom" style={{ minWidth: '220px', maxWidth: '300px' }}>
      {/* Accent bar */}
      <div
        style={{
          height: '4px',
          backgroundColor: accentColor,
          borderRadius: '4px 4px 0 0',
        }}
      />

      {/* Region name */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          margin: '8px 0 4px',
          color: '#1E293B',
        }}
      >
        {regionName}
      </h3>

      {/* Indicators */}
      {displayIndicators.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#94A3B8',
              marginBottom: '4px',
            }}
          >
            {t('map:region_popup.indicators')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {displayIndicators.map((ind, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#475569' }}>{ind.label}</span>
                <span style={{ fontWeight: 600, color: '#1E293B' }}>
                  {typeof ind.value === 'number'
                    ? formatNumber(ind.value, ind.decimals ?? 1)
                    : String(ind.value)}
                  {ind.unit ? ` ${ind.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View details link — data-action triggers event delegation in ExplorePage */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
        <a
          href="#"
          data-action="open-zone-detail"
          data-region-name={regionName}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#1B5E20',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            display: 'inline-block',
          }}
        >
          {t('map:region_popup.view_details')} →
        </a>
      </div>
    </div>
  );
}

/**
 * Build indicator list from properties when no explicit indicators are passed.
 * Handles all known analysis property keys.
 */
function buildIndicators(
  props: Record<string, string | number | boolean | null | undefined>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _t: (key: string) => string,
): Array<{ label: string; value: string | number; unit?: string; decimals?: number }> {
  const indicators: Array<{ label: string; value: string | number; unit?: string; decimals?: number }> = [];

  if (props.density !== undefined) {
    indicators.push({ label: 'Densité', value: props.density as number, unit: 'expl./km²', decimals: 3 });
  }
  const exploitationsVal = props.n_exploitations ?? props.total_exploitations ?? props.nb_exploitations;
  if (exploitationsVal !== undefined && exploitationsVal !== null) {
    indicators.push({ label: 'Exploitations', value: Number(exploitationsVal) });
  }
  if (props.coverage_pct !== undefined) {
    indicators.push({ label: 'Couverture ZAAP', value: props.coverage_pct as number, unit: '%' });
  }
  const zaapSitesVal = props.n_zaap ?? props.total_zones;
  if (zaapSitesVal !== undefined && zaapSitesVal !== null) {
    indicators.push({ label: 'Sites ZAAP', value: Number(zaapSitesVal) });
  }
  if (props.avg_distance_km !== undefined) {
    indicators.push({ label: 'Distance moyenne', value: props.avg_distance_km as number, unit: 'km' });
  }
  if (props.n_cooperatives !== undefined) {
    indicators.push({ label: 'Coopératives', value: props.n_cooperatives as number });
  }
  if (props.coop_density_per_1000km2 !== undefined) {
    indicators.push({ label: 'Densité coop.', value: props.coop_density_per_1000km2 as number, unit: '/1000 km²', decimals: 3 });
  }
  if (props.synthesis_score !== undefined) {
    indicators.push({ label: 'Score composite', value: (props.synthesis_score as number).toFixed(1), unit: '/100' });
  }
  if (props.priority_level !== undefined) {
    indicators.push({ label: 'Priorité', value: props.priority_level as string });
  }

  return indicators;
}
