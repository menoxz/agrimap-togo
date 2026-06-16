import { X, Navigation, Target } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
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
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
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
  const region = safeStr(zone.nom_region || zone.region || '');
  const densityRaw = safeNum(zone.density);
  const marketDistance = safeNum(zone.distance_moyenne_km);
  const coopCount = safeNum(zone.coop_count);

  const badgeInfo = getPriorityBadge(score);

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
              <div className="bg-surface-alt/50 rounded-md p-2 text-center">
                <p className="text-h4 font-bold text-text">
                  {densityRaw > 0 ? densityRaw.toFixed(1) : '—'}
                </p>
                <p className="text-caption text-muted">{t('map:zone_detail.farms_density')}</p>
              </div>
              <div className="bg-surface-alt/50 rounded-md p-2 text-center">
                <p className="text-h4 font-bold text-text">
                  {marketDistance > 0 ? `${marketDistance.toFixed(1)}km` : '—'}
                </p>
                <p className="text-caption text-muted">{t('map:zone_detail.market_distance')}</p>
              </div>
              <div className="bg-surface-alt/50 rounded-md p-2 text-center">
                <p className="text-h4 font-bold text-text">
                  {coopCount > 0 ? coopCount.toFixed(0) : '—'}
                </p>
                <p className="text-caption text-muted">{t('map:zone_detail.cooperatives')}</p>
              </div>
            </div>
          </div>

          {/* Sub-scores */}
          <div>
            <h4 className="text-caption text-muted uppercase tracking-wide font-semibold mb-2">
              {t('map:zone_detail.sub_scores')}
            </h4>
            <div className="space-y-1.5">
              <SubScoreBar
                label={t('map:zone_detail.density')}
                value={densityScore}
                color={CB_SYNTHESIS[0]}
              />
              <SubScoreBar
                label={t('map:zone_detail.zaap')}
                value={zaapScore}
                color={CB_SYNTHESIS[1]}
              />
              <SubScoreBar
                label={t('map:zone_detail.accessibility')}
                value={accessScore}
                color={CB_SYNTHESIS[3]}
              />
              <SubScoreBar
                label={t('map:zone_detail.cooperative')}
                value={coopScore}
                color={CB_SYNTHESIS[4]}
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
              <span className="text-caption text-muted">{priorite || '—'}</span>
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
