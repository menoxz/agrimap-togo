import {
  X,
  MapPin,
  MapPinOff,
  BarChart3,
  Navigation,
  Users,
  Store,
  Handshake,
  Sprout,
  Building2,
  Activity,
  Ruler,
  Target,
  TreePine,
  Info,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import Badge from '@/components/ui/Badge'
import { CB_DENSITY, CB_ACCESS, CB_COOP, CB_ZAAP } from '@/utils/colors'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrefectureDetailData {
  nom_prefecture?: string
  name_en?: string
  region?: string
  service_score?: number
  synthesis_score?: number
  priority_level?: string
  density_score?: number
  accessibility_score?: number
  coop_score?: number
  zaap_score?: number
  n_marches?: number
  n_cooperatives?: number
  n_exploitations?: number
  n_zaap?: number
  n_pepinieres?: number
  density?: number
  avg_distance_km?: number
  white_zone_pct?: number
  coverage_pct?: number
  interpretation?: string
}

interface PrefectureDetailPanelProps {
  prefecture: {
    nom_prefecture?: string
    name_en?: string
    region?: string
    service_score?: number
    synthesis_score?: number
    priority_level?: string
    density_score?: number
    accessibility_score?: number
    coop_score?: number
    zaap_score?: number
    n_marches?: number
    n_cooperatives?: number
    n_exploitations?: number
    n_zaap?: number
    n_pepinieres?: number
    density?: number
    avg_distance_km?: number
    white_zone_pct?: number
    coverage_pct?: number
    interpretation?: string
  } | null
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── InfoTooltip ───────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(!open)}
    >
      <Info size={12} className="text-stone-400 cursor-help hover:text-stone-600 transition-colors" />
      {open && (
        <span className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 px-3 py-2 text-xs leading-relaxed text-white bg-stone-800 rounded-md shadow-lg w-60 text-center font-normal not-italic pointer-events-none">
          {text}
        </span>
      )}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrefectureDetailPanel({
  prefecture,
  onClose,
}: PrefectureDetailPanelProps) {
  const { t, currentLang } = useTranslation()

  if (!prefecture) return null

  const {
    nom_prefecture,
    name_en,
    region,
    synthesis_score,
    priority_level,
    density_score,
    accessibility_score,
    coop_score,
    zaap_score,
    n_marches,
    n_cooperatives,
    n_exploitations,
    n_zaap,
    n_pepinieres,
    density,
    avg_distance_km,
    white_zone_pct,
    coverage_pct,
    interpretation,
  } = prefecture

  // Computed display values
  const displayName =
    currentLang === 'en' && name_en ? name_en : nom_prefecture

  const synthScore = Math.round(synthesis_score ?? 0)

  const hasBreakdown =
    density_score !== undefined ||
    accessibility_score !== undefined ||
    coop_score !== undefined ||
    zaap_score !== undefined

  const hasMetrics =
    density !== undefined ||
    avg_distance_km !== undefined ||
    white_zone_pct !== undefined ||
    coverage_pct !== undefined

  const [legendOpen, setLegendOpen] = useState(false)

  // Translate raw GeoJSON priority_level string via i18n
  const translatePriorityLevel = (raw: string | undefined): string => {
    if (!raw) return ''
    const key = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
    return t(`map:prefecture_detail.priority.${key}`) || raw
  }

  return (
    <div className="w-full bg-white border border-stone-200 shadow-sm mt-4 mobile:p-3">
      <div className="p-5 space-y-0">

        {/* ── Section 1 — IDENTITY ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              {displayName}
            </h2>
            {region && (
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                <MapPin size={14} className="text-stone-400" />
                {t('map:prefecture_detail.region')}:{' '}
                {region}
              </p>
            )}
            {priority_level && (
              <span className="flex items-center gap-1 mt-2">
                <Badge
                  variant={
                    ((l) => {
                      if (l.includes('haute') || l.includes('high') || l.includes('critique') || l.includes('critical')) return 'error'
                      if (l.includes('moyen') || l.includes('medium') || l.includes('modér') || l.includes('moderate')) return 'warning'
                      if (l.includes('bien') || l.includes('well')) return 'success'
                      return 'info'
                    })((priority_level ?? '').toLowerCase())}
                >
                  {translatePriorityLevel(priority_level)}
                </Badge>
                <InfoTooltip text={t('map:prefecture_detail.tooltip.priority_level')} />
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 transition-colors"
            aria-label={t('map:prefecture_detail.close')}
            title={t('map:prefecture_detail.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Section 2 — VERDICT ──────────────────────────────────────────── */}
        {synthesis_score !== undefined && (
          <div className="border-t border-stone-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
              {t('map:prefecture_detail.synthesis_score')}
              <InfoTooltip text={t('map:prefecture_detail.tooltip.synthesis_score')} />
            </p>
            <p
              className={`text-5xl font-black tabular-nums leading-none mt-1 ${
                synthScore < 40 ? 'text-red-600' : synthScore <= 65 ? 'text-amber-600' : 'text-green-700'
              }`}
            >
              {synthScore}/100
            </p>
            <div className="h-2 mt-3 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${synthScore}%`,
                  backgroundColor: synthScore < 40 ? '#DC2626' : synthScore <= 65 ? '#D97706' : '#15803D',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Section 3 — BREAKDOWN ────────────────────────────────────────── */}
        {hasBreakdown && (
          <div className="border-t border-stone-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
              {t('map:prefecture_detail.breakdown_title')}
            </p>
            <div className="grid grid-cols-2 gap-2">

              {/* Densité */}
              <div className="border border-stone-100 p-3">
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                  <BarChart3 size={14} />
                  {t('map:prefecture_detail.density_score')}
                  <InfoTooltip text={t('map:prefecture_detail.tooltip.density_score')} />
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {density_score !== undefined
                    ? `${Math.round(density_score)}/100`
                    : <span className="inline-block bg-stone-200 animate-pulse rounded-sm w-16 h-5 align-middle" />}
                </p>
                {density_score !== undefined ? (
                  <div className="h-1 mt-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round(density_score)}%`,
                        backgroundColor: CB_DENSITY[3],
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-1 mt-2 bg-stone-200 rounded-full animate-pulse" />
                )}
              </div>

              {/* Accessibilité */}
              <div className="border border-stone-100 p-3">
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                  <Navigation size={14} />
                  {t('map:prefecture_detail.access_score')}
                  <InfoTooltip text={t('map:prefecture_detail.tooltip.access_score')} />
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {accessibility_score !== undefined
                    ? `${Math.round(accessibility_score)}/100`
                    : <span className="inline-block bg-stone-200 animate-pulse rounded-sm w-16 h-5 align-middle" />}
                </p>
                {accessibility_score !== undefined ? (
                  <div className="h-1 mt-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round(accessibility_score)}%`,
                        backgroundColor: CB_ACCESS[3],
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-1 mt-2 bg-stone-200 rounded-full animate-pulse" />
                )}
              </div>

              {/* Coopératives */}
              <div className="border border-stone-100 p-3">
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                  <Users size={14} />
                  {t('map:prefecture_detail.coop_score')}
                  <InfoTooltip text={t('map:prefecture_detail.tooltip.coop_score')} />
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {coop_score !== undefined
                    ? `${Math.round(coop_score)}/100`
                    : <span className="inline-block bg-stone-200 animate-pulse rounded-sm w-16 h-5 align-middle" />}
                </p>
                {coop_score !== undefined ? (
                  <div className="h-1 mt-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round(coop_score)}%`,
                        backgroundColor: CB_COOP[2],
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-1 mt-2 bg-stone-200 rounded-full animate-pulse" />
                )}
              </div>

              {/* ZAAP */}
              <div className="border border-stone-100 p-3">
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                  <TreePine size={14} />
                  {t('map:prefecture_detail.zaap_score')}
                  <InfoTooltip text={t('map:prefecture_detail.tooltip.zaap_score')} />
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {zaap_score !== undefined
                    ? `${Math.round(zaap_score)}/100`
                    : <span className="inline-block bg-stone-200 animate-pulse rounded-sm w-16 h-5 align-middle" />}
                </p>
                {zaap_score !== undefined ? (
                  <div className="h-1 mt-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round(zaap_score)}%`,
                        backgroundColor: CB_ZAAP[3],
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-1 mt-2 bg-stone-200 rounded-full animate-pulse" />
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Section 4 — INVENTORY ────────────────────────────────────────── */}
        <div className="border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
            {t('map:prefecture_detail.inventory_title')}
          </p>
          <div className="grid grid-cols-2 gap-3">

            {/* Marchés */}
            <div className="border-l-4 border-stone-200 pl-3 py-2 border-b border-stone-100 last:border-0">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Store size={14} />
                {t('map:prefecture_detail.markets')}
              </div>
              <p className="text-3xl font-black tabular-nums text-stone-900">
                {n_marches ?? 0}
              </p>
            </div>

            {/* Coopératives */}
            <div className="border-l-4 border-stone-200 pl-3 py-2 border-b border-stone-100 last:border-0">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Handshake size={14} />
                {t('map:prefecture_detail.cooperatives')}
              </div>
              <p className="text-3xl font-black tabular-nums text-stone-900">
                {n_cooperatives ?? 0}
              </p>
            </div>

            {/* Exploitations */}
            <div className="border-l-4 border-stone-200 pl-3 py-2 border-b border-stone-100 last:border-0">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Sprout size={14} />
                {t('map:prefecture_detail.farms')}
              </div>
              <p className="text-3xl font-black tabular-nums text-stone-900">
                {n_exploitations ?? 0}
              </p>
            </div>

            {/* ZAAP / Pépinières */}
            <div className="border-l-4 border-stone-200 pl-3 py-2 border-b border-stone-100 last:border-0">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Building2 size={14} />
                {t('map:prefecture_detail.zaap_pep')}
              </div>
              <p className="text-3xl font-black tabular-nums text-stone-900">
                {(n_zaap ?? 0) + (n_pepinieres ?? 0)}
              </p>
            </div>

          </div>
        </div>

        {/* ── Section 5 — METRICS ──────────────────────────────────────────── */}
        {hasMetrics && (
          <div className="border-t border-stone-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
              {t('map:prefecture_detail.metrics_title')}
            </p>
            <div>

              {density !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-stone-400" />
                    <span className="text-sm text-stone-600">
                      {t('map:prefecture_detail.density_raw')}
                      <InfoTooltip text={t('map:prefecture_detail.tooltip.density_raw')} />
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">
                    {density === 0 ? '0.000' : density.toFixed(3)}
                  </span>
                </div>
              )}

              {avg_distance_km !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Ruler size={14} className="text-stone-400" />
                    <span className="text-sm text-stone-600">
                      {t('map:prefecture_detail.avg_distance')}
                      <InfoTooltip text={t('map:prefecture_detail.tooltip.avg_distance')} />
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">
                    {avg_distance_km.toFixed(1)} km
                  </span>
                </div>
              )}

              {white_zone_pct !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <MapPinOff size={14} className="text-stone-400" />
                    <span className="text-sm text-stone-600">
                      {t('map:prefecture_detail.white_zones')}
                      <InfoTooltip text={t('map:prefecture_detail.tooltip.white_zones')} />
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">
                    {white_zone_pct.toFixed(1)} %
                  </span>
                </div>
              )}

              {coverage_pct !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-stone-400" />
                    <span className="text-sm text-stone-600">
                      {t('map:prefecture_detail.zaap_coverage')}
                      <InfoTooltip text={t('map:prefecture_detail.tooltip.zaap_coverage')} />
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">
                    {coverage_pct.toFixed(1)} %
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Section 6 — ACTION (interprétation) ──────────────────────────── */}
        {interpretation && interpretation.trim().length > 0 && (
          <div className="border-t border-stone-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
              {t('map:prefecture_detail.interpretation_title')}
            </p>
            <div className="bg-stone-50 border-l-4 border-stone-400 p-3 mt-2 text-sm text-stone-700 italic leading-relaxed">
              {interpretation}
            </div>
          </div>
        )}

        {/* ── Section 7 — LEGEND (collapsible) ──────────────────────────── */}
        <div className="border-t border-stone-200 pt-4">
          <button
            onClick={() => setLegendOpen(!legendOpen)}
            className="w-full text-left flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-500 hover:text-stone-700 transition-colors"
          >
            <HelpCircle size={14} />
            {t('map:prefecture_detail.legend.title')}
            <ChevronDown
              size={14}
              className={`ml-auto transition-transform ${legendOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {legendOpen && (
            <div className="mt-3 space-y-2 text-xs text-stone-600 leading-relaxed">
              <p>{t('map:prefecture_detail.legend.zaap')}</p>
              <p>{t('map:prefecture_detail.legend.thresholds')}</p>
              <p className="text-stone-400 italic">{t('map:prefecture_detail.legend.calculation')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
