import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/utils/formatters';

interface RegionPopupProps {
  properties: Record<string, string | number | boolean | null | undefined>;
  /** Analysis-specific indicator fields to show */
  indicators?: Array<{
    label: string;
    value: string | number;
    unit?: string;
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
                    ? formatNumber(ind.value)
                    : String(ind.value)}
                  {ind.unit ? ` ${ind.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View details link */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
        <a
          href="/story#synthesis"
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
): Array<{ label: string; value: string | number; unit?: string }> {
  const indicators: Array<{ label: string; value: string | number; unit?: string }> = [];

  if (props.density !== undefined) {
    indicators.push({ label: 'Densité', value: props.density as number, unit: 'expl./km²' });
  }
  if (props.exploitations !== undefined) {
    indicators.push({ label: 'Exploitations', value: props.exploitations as number });
  }
  if (props.coverage_pct !== undefined) {
    indicators.push({ label: 'Couverture ZAAP', value: props.coverage_pct as number, unit: '%' });
  }
  if (props.zaap_count !== undefined) {
    indicators.push({ label: 'Sites ZAAP', value: props.zaap_count as number });
  }
  if (props.distance_moyenne_km !== undefined) {
    indicators.push({ label: 'Distance moyenne', value: props.distance_moyenne_km as number, unit: 'km' });
  }
  if (props.temps_moyen_min !== undefined) {
    indicators.push({ label: 'Temps moyen', value: props.temps_moyen_min as number, unit: 'min' });
  }
  if (props.coop_count !== undefined) {
    indicators.push({ label: 'Coopératives', value: props.coop_count as number });
  }
  if (props.coop_density !== undefined) {
    indicators.push({ label: 'Densité coop.', value: props.coop_density as number, unit: '/100k' });
  }
  if (props.score_composite !== undefined) {
    indicators.push({ label: 'Score composite', value: (props.score_composite as number).toFixed(2) });
  }
  if (props.priorite !== undefined) {
    indicators.push({ label: 'Priorité', value: props.priorite as string });
  }

  return indicators;
}
