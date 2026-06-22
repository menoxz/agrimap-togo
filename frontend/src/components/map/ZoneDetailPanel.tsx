import { X, Navigation, Target } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRegionStats } from '@/hooks/useRegionStats';
import Badge from '@/components/ui/Badge';
import { CB_SYNTHESIS } from '@/utils/colors';
import type { GeoJsonPropertyMap } from '@/types/map';

// ── Types ──────────────────────────────────────────────────────────────────
interface ZoneDetailPanelProps {
  zone: GeoJsonPropertyMap | null;
  onClose: () => void;
  onCenter: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score < 0.2) return CB_SYNTHESIS[0];
  if (score < 0.4) return CB_SYNTHESIS[1];
  if (score < 0.6) return CB_SYNTHESIS[2];
  if (score < 0.8) return CB_SYNTHESIS[3];
  return CB_SYNTHESIS[4];
}

function getPriorityBadge(score: number): { variant: 'error' | 'warning' | 'success' | 'info'; label: string } {
  if (score < 0.2) return { variant: 'error', label: 'Priorité maximale' };
  if (score < 0.4) return { variant: 'warning', label: 'Prioritaire' };
  if (score < 0.6) return { variant: 'info', label: 'Surveillance' };
  if (score < 0.8) return { variant: 'success', label: 'Bien desservi' };
  return { variant: 'success', label: 'Très bien desservi' };
}

function safeNum(val: string | number | boolean | null | undefined): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}

function safeStr(val: string | number | boolean | null | undefined): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

// ── Score Gauge sub-component ──────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = getScoreColor(score);

  return (
    <div className="flex items-center gap-3">
      {/* Circular gauge */}
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 40 40" className="w-14 h-14 -rotate-90">
          {/* Background circle */}
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="4"
          />
          {/* Value circle */}
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-body-sm font-bold"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>

      {/* Label + badge */}
      <div className="flex flex-col">
        <span className="text-caption text-muted uppercase tracking-wide">
          Score composite
        </span>
        <Badge variant={getPriorityBadge(score).variant} size="sm">
          {getPriorityBadge(score).label}
        </Badge>
      </div>
    </div>
  );
}

// ── Sub-score bar ──────────────────────────────────────────────────────────
function SubScoreBar({
  label,
  value,
  color,
  interpretation,
}: {
  label: string;
  value: number;
  color: string;
  interpretation?: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-body-sm text-text-secondary w-28 shrink-0">{label}</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-body-sm font-semibold text-text w-8 text-right">
          {pct}%
        </span>
      </div>
      {interpretation && (
        <p className="text-[10px] text-muted italic mt-0.5 leading-tight">{interpretation}</p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
/**
 * ZoneDetailPanel — Detail panel for a selected priority zone.
 * Shows composite score (circular gauge), sub-scores (bars), key figures,
 * and an action button to center the map on this zone.
 *
 * Renders as a fixed overlay on mobile and a side panel on desktop.
 */
export default function ZoneDetailPanel({
  zone,
  onClose,
  onCenter,
}: ZoneDetailPanelProps) {
  const { t } = useTranslation();

  // Resolve region before early-return so hooks are called unconditionally
  const region = zone ? safeStr(zone.nom_region || zone.region || '') : '';
  const regionStats = useRegionStats(region);

  if (!zone) return null;

  // GeoJSON stores scores in 0-100 range; components expect 0-1 range
  const score = safeNum(zone.synthesis_score) / 100;
  const rank = safeNum(zone.synthesis_class);
  const priorite = safeStr(zone.priority_level);
  const densityScore = safeNum(zone.density_score) / 100;
  const zaapScore = safeNum(zone.zaap_score) / 100;
  const accessScore = safeNum(zone.access_score) / 100;
  const coopScore = safeNum(zone.coop_score) / 100;
  const zoneName = safeStr(zone.nom_zone || zone.zone || '');
  const densityRaw = safeNum(zone.density);
  // Market distance: prefer zone.avg_distance_km (added by ETL v2), else estimate from access_score
  const marketDistanceDisplay: string = (() => {
    const avgDist = zone.avg_distance_km;
    if (typeof avgDist === 'number' && avgDist > 0) return `${avgDist.toFixed(1)} km`;
    if (zone.access_score !== null && zone.access_score !== undefined) {
      const estKm = Math.round((100 - accessScore * 100) * 0.22 + 1);
      return `~${estKm} km`;
    }
    return 'Non renseigné';
  })();

  const badgeInfo = getPriorityBadge(score);

  // ── Score interpretation helpers ─────────────────────────────────────────
  const densityLabel = (() => {
    const pct = Math.round(densityScore * 100);
    if (pct < 40) return t('map:zone_detail.interp_density_low', { pct });
    if (pct < 70) return t('map:zone_detail.interp_density_medium', { pct });
    return t('map:zone_detail.interp_density_high', { pct });
  })();

  const zaapLabel = (() => {
    const pct = Math.round(zaapScore * 100);
    if (pct >= 100) return t('map:zone_detail.interp_zaap_full');
    if (pct >= 50) return t('map:zone_detail.interp_zaap_partial', { pct });
    return t('map:zone_detail.interp_zaap_low', { pct });
  })();

  const accessLabel = (() => {
    const pct = Math.round(accessScore * 100);
    const missing = 100 - pct;
    if (pct < 40) return t('map:zone_detail.interp_access_critical', { pct: missing });
    if (pct < 70) return t('map:zone_detail.interp_access_poor', { pct: missing });
    return t('map:zone_detail.interp_access_good');
  })();

  const coopLabel = (() => {
    const pct = Math.round(coopScore * 100);
    const missing = 100 - pct;
    if (pct < 30) return t('map:zone_detail.interp_coop_low', { pct: missing });
    if (pct < 60) return t('map:zone_detail.interp_coop_partial', { pct: missing });
    return t('map:zone_detail.interp_coop_good');
  })();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2000] desktop:inset-auto desktop:right-4 desktop:top-24 desktop:w-80 desktop:max-h-[calc(100vh-8rem)]">
      {/* Overlay backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/20 desktop:hidden"
        onClick={onClose}
      />

      {/* Panel content */}
      <div className="relative bg-white rounded-t-xl desktop:rounded-xl shadow-xl border border-border overflow-y-auto max-h-[70vh] desktop:max-h-full">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-start justify-between p-4 pb-2 border-b border-border/50">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-h3 font-bold text-text truncate">
              {zoneName || region || `Zone #${rank}`}
            </h3>
            {region && (
              <p className="text-body-sm text-text-secondary mt-0.5">{region}</p>
            )}
            {rank > 0 && (
              <p className="text-caption text-muted mt-0.5">
                {t('map:zone_detail.rank')} : #{rank}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-text-secondary transition-colors"
            aria-label={t('map:zone_detail.close')}
            title={t('map:zone_detail.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Composite score gauge */}
          <div className="bg-surface-alt/50 rounded-lg p-3">
            <ScoreGauge score={score} />
          </div>

          {/* Key figures */}
          <div>
            <h4 className="text-caption text-muted uppercase tracking-wide font-semibold mb-2">
              {t('map:zone_detail.key_figures')}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Farms: n_exploitations from regionStats if available, else density×100 /km² */}
              <div className="bg-surface-alt/50 rounded-md p-2 text-center">
                <p className="text-h4 font-bold text-text">
                  {regionStats.loading
                    ? '…'
                    : regionStats.n_exploitations > 0
                      ? regionStats.n_exploitations.toString()
                      : densityRaw > 0
                        ? `${(densityRaw * 100).toFixed(1)}`
                        : '…'}
                </p>
                <p className="text-caption text-muted">
                  {!regionStats.loading && regionStats.n_exploitations > 0
                    ? t('map:zone_detail.farms_count')
                    : densityRaw > 0
                      ? `${t('map:zone_detail.farms_density')} /100km²`
                      : t('map:zone_detail.farms_density')}
                </p>
              </div>
              {/* Market distance: real value or estimated from access_score */}
              <div className="bg-surface-alt/50 rounded-md p-2 text-center">
                <p className="text-h4 font-bold text-text">
                  {marketDistanceDisplay}
                </p>
                <p className="text-caption text-muted">{t('map:zone_detail.market_distance')}</p>
              </div>
              {/* Cooperatives: always a number from regionStats (0 is valid, never '—') */}
              <div className="bg-surface-alt/50 rounded-md p-2 text-center">
                <p className="text-h4 font-bold text-text">
                  {regionStats.loading ? '…' : regionStats.n_cooperatives}
                </p>
                <p className="text-caption text-muted">{t('map:zone_detail.cooperatives')}</p>
              </div>
            </div>
          </div>

          {/* ── Services présents ─────────────────────────────────────────── */}
          <div>
            <h4 className="text-caption text-muted uppercase tracking-wide font-semibold mb-2">
              {t('map:zone_detail.services_title')}
            </h4>
            {regionStats.loading ? (
              <p className="text-caption text-muted italic">
                {t('map:zone_detail.services_loading')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { key: 'services_marches',      count: regionStats.n_marches },
                    { key: 'services_cooperatives',  count: regionStats.n_cooperatives },
                    { key: 'services_zaap',          count: regionStats.n_zaap },
                    { key: 'services_pepinieres',    count: regionStats.n_pepinieres },
                    { key: 'services_exploitations', count: regionStats.n_exploitations },
                  ] as const
                ).map(({ key, count }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-surface-alt/50 rounded-md"
                  >
                    <span className="text-[11px] text-text-secondary">
                      {t(`map:zone_detail.${key}`)}
                    </span>
                    <span className="text-body-sm font-bold text-togo-green ml-2 tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-scores */}
          <div>
            <h4 className="text-caption text-muted uppercase tracking-wide font-semibold mb-2">
              {t('map:zone_detail.sub_scores')}
            </h4>
            <div className="space-y-2">
              <SubScoreBar
                label={t('map:zone_detail.density')}
                value={densityScore}
                color={CB_SYNTHESIS[0]}
                interpretation={densityLabel}
              />
              <SubScoreBar
                label={t('map:zone_detail.zaap')}
                value={zaapScore}
                color={CB_SYNTHESIS[1]}
                interpretation={zaapLabel}
              />
              <SubScoreBar
                label={t('map:zone_detail.accessibility')}
                value={accessScore}
                color={CB_SYNTHESIS[3]}
                interpretation={accessLabel}
              />
              <SubScoreBar
                label={t('map:zone_detail.cooperative')}
                value={coopScore}
                color={CB_SYNTHESIS[4]}
                interpretation={coopLabel}
              />
            </div>
          </div>

          {/* Action: Center on zone */}
          <button
            onClick={onCenter}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors font-medium text-body-sm"
          >
            <Navigation size={16} />
            {t('map:zone_detail.center_map')}
          </button>

          {/* Priority badge footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <Target size={14} className="text-muted" />
              <span className="text-caption text-muted">{priorite || 'Non renseigné'}</span>
            </div>
            <Badge variant={badgeInfo.variant} size="sm">
              {badgeInfo.label}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
