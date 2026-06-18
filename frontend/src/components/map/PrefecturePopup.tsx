import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/utils/formatters';

interface PrefecturePopupProps {
  properties: Record<string, string | number | boolean | null | undefined>;
  analysisType?: 'density' | 'zaap' | 'access' | 'coop' | 'synthesis';
  /** Override accent color */
  accentColor?: string;
}

/**
 * PrefecturePopup — Rich popup content for prefecture features.
 * Shows prefecture name (title), region (subtitle), and analysis-specific
 * indicators based on analysisType. Includes a link to open the detail panel.
 *
 * Rendered via renderToString so it uses inline styles exclusively.
 */
export default function PrefecturePopup({
  properties,
  analysisType = 'synthesis',
  accentColor,
}: PrefecturePopupProps) {
  const { t } = useTranslation();
  const prefectureName = (properties.nom_prefecture as string) || '';
  const regionName = (properties.region as string) || '';

  const popupAccent = accentColor ?? getAccentColor(analysisType);
  const indicators = buildIndicators(properties, analysisType);

  return (
    <div className="leaflet-popup-custom" style={{ minWidth: '220px', maxWidth: '300px' }}>
      {/* Accent bar */}
      <div
        style={{
          height: '4px',
          backgroundColor: popupAccent,
          borderRadius: '4px 4px 0 0',
        }}
      />

      {/* Prefecture name */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          margin: '8px 0 2px',
          color: '#1E293B',
        }}
      >
        {prefectureName}
      </h3>

      {/* Region subtitle */}
      {regionName && (
        <p
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#64748B',
            margin: '0 0 4px',
          }}
        >
          {regionName}
        </p>
      )}

      {/* Indicators */}
      {indicators.length > 0 && (
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
            {indicators.map((ind, i) => (
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

      {/* View details link — data-action triggers event delegation in ExplorePage */}
      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
        <a
          href="#"
          data-action="open-prefecture-detail"
          data-prefecture-name={prefectureName}
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
 * Get accent color based on analysis type.
 */
function getAccentColor(analysisType: string): string {
  switch (analysisType) {
    case 'density':
      return '#D95F0E';
    case 'access':
      return '#756BB1';
    case 'coop':
      return '#FC8D59';
    case 'zaap':
      return '#1B7837';
    case 'synthesis':
    default:
      return '#1A9850';
  }
}

/**
 * Build indicator list from properties based on analysisType.
 */
function buildIndicators(
  props: Record<string, string | number | boolean | null | undefined>,
  analysisType: string,
): Array<{ label: string; value: string | number; unit?: string }> {
  const indicators: Array<{ label: string; value: string | number; unit?: string }> = [];

  switch (analysisType) {
    case 'density': {
      const nExploitations = props.n_exploitations;
      const density = props.density;
      const densityLabel = props.density_label;

      if (nExploitations !== undefined) {
        indicators.push({ label: 'Exploitations', value: nExploitations as number });
      }
      if (density !== undefined) {
        indicators.push({ label: 'Densité', value: density as number, unit: 'fermes/km²' });
      }
      if (densityLabel !== undefined) {
        indicators.push({ label: 'Classe', value: densityLabel as string });
      }
      break;
    }

    case 'access': {
      const score = props.accessibility_score;
      const avgDistance = props.avg_distance_km;

      if (score !== undefined) {
        indicators.push({ label: "Score d'accès", value: (score as number).toFixed(1), unit: '/100' });
      }
      if (avgDistance !== undefined) {
        indicators.push({ label: 'Distance moyenne', value: avgDistance as number, unit: 'km' });
      }
      break;
    }

    case 'coop': {
      const density = props.coop_density_per_1000km2;
      const whiteZone = props.white_zone_pct;

      if (density !== undefined) {
        indicators.push({ label: 'Densité coop.', value: density as number, unit: '/1000 km²' });
      }
      if (whiteZone !== undefined) {
        indicators.push({ label: 'Zone blanche', value: (whiteZone as number).toFixed(1), unit: '%' });
      }
      break;
    }

    case 'zaap': {
      const coverage = props.coverage_pct;
      const zaapCount = (props.total_zones as number) ?? (props.n_zaap as number) ?? 0;

      if (coverage !== undefined) {
        indicators.push({ label: 'Couverture ZAAP', value: coverage as number, unit: '%' });
      }
      if (zaapCount > 0) {
        indicators.push({ label: 'Sites ZAAP', value: zaapCount as number });
      }
      break;
    }

    case 'synthesis':
    default: {
      const score = props.synthesis_score;
      const priority = props.priority_level;

      if (score !== undefined) {
        indicators.push({ label: 'Score synthèse', value: (score as number).toFixed(1), unit: '/100' });
      }
      if (priority !== undefined) {
        indicators.push({ label: 'Priorité', value: priority as string });
      }
      break;
    }
  }

  return indicators;
}
