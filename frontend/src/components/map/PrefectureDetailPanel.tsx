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
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

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

function getSynthesisColor(score: number): string {
  if (score < 40) return 'text-red-600'
  if (score <= 65) return 'text-amber-600'
  return 'text-green-700'
}

function getSynthesisBarColor(score: number): string {
  if (score < 40) return '#D7191C'
  if (score <= 65) return '#F4A928'
  return '#1A9641'
}

function getPriorityBadgeClass(level: string): string {
  const l = level.toLowerCase()
  if (l.includes('critique') || l.includes('critical')) {
    return 'bg-red-100 text-red-800 border-red-300'
  }
  if (l.includes('modér') || l.includes('moderate')) {
    return 'bg-amber-100 text-amber-800 border-amber-300'
  }
  if (l.includes('bien') || l.includes('well')) {
    return 'bg-green-100 text-green-800 border-green-300'
  }
  return 'bg-stone-100 text-stone-600 border-stone-300'
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

  const synthScore = synthesis_score ?? 0

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

  return (
    <div className="absolute top-0 right-0 h-full w-96 max-w-full bg-white border-l border-stone-300 shadow-xl z-50 overflow-y-auto">
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
              <span
                className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-none border mt-2 inline-block ${getPriorityBadgeClass(priority_level)}`}
              >
                {priority_level}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
            aria-label={t('map:prefecture_detail.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Section 2 — VERDICT ──────────────────────────────────────────── */}
        {synthesis_score !== undefined && (
          <div className="border-t border-stone-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              {t('map:prefecture_detail.synthesis_score')}
            </p>
            <p
              className={`text-5xl font-black tabular-nums leading-none mt-1 ${getSynthesisColor(synthScore)}`}
            >
              {synthScore}/100
            </p>
            <div className="h-2 mt-3 rounded-none bg-stone-100">
              <div
                className="h-full rounded-none"
                style={{
                  width: `${synthScore}%`,
                  backgroundColor: getSynthesisBarColor(synthScore),
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
                  <BarChart3 size={12} />
                  {t('map:prefecture_detail.density_score')}
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {density_score ?? 0}/100
                </p>
                <div className="h-1 mt-2 bg-stone-100 rounded-none">
                  <div
                    className="h-full rounded-none"
                    style={{
                      width: `${density_score ?? 0}%`,
                      backgroundColor: '#D95F0E',
                    }}
                  />
                </div>
              </div>

              {/* Accessibilité */}
              <div className="border border-stone-100 p-3">
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                  <Navigation size={12} />
                  {t('map:prefecture_detail.access_score')}
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {accessibility_score ?? 0}/100
                </p>
                <div className="h-1 mt-2 bg-stone-100 rounded-none">
                  <div
                    className="h-full rounded-none"
                    style={{
                      width: `${accessibility_score ?? 0}%`,
                      backgroundColor: '#756BB1',
                    }}
                  />
                </div>
              </div>

              {/* Coopératives */}
              <div className="border border-stone-100 p-3">
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                  <Users size={12} />
                  {t('map:prefecture_detail.coop_score')}
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {coop_score ?? 0}/100
                </p>
                <div className="h-1 mt-2 bg-stone-100 rounded-none">
                  <div
                    className="h-full rounded-none"
                    style={{
                      width: `${coop_score ?? 0}%`,
                      backgroundColor: '#FC8D59',
                    }}
                  />
                </div>
              </div>

              {/* ZAAP */}
              <div className="border border-stone-100 p-3">
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                  <TreePine size={12} />
                  {t('map:prefecture_detail.zaap_score')}
                </div>
                <p className="text-lg font-bold text-stone-900">
                  {zaap_score ?? 0}/100
                </p>
                <div className="h-1 mt-2 bg-stone-100 rounded-none">
                  <div
                    className="h-full rounded-none"
                    style={{
                      width: `${zaap_score ?? 0}%`,
                      backgroundColor: '#1B7837',
                    }}
                  />
                </div>
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
            <div className="border-l-4 border-stone-200 pl-3 py-2">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Store size={12} />
                {t('map:prefecture_detail.markets')}
              </div>
              <p className="text-3xl font-black tabular-nums text-stone-900">
                {n_marches ?? 0}
              </p>
            </div>

            {/* Coopératives */}
            <div className="border-l-4 border-stone-200 pl-3 py-2">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Handshake size={12} />
                {t('map:prefecture_detail.cooperatives')}
              </div>
              <p className="text-3xl font-black tabular-nums text-stone-900">
                {n_cooperatives ?? 0}
              </p>
            </div>

            {/* Exploitations */}
            <div className="border-l-4 border-stone-200 pl-3 py-2">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Sprout size={12} />
                {t('map:prefecture_detail.farms')}
              </div>
              <p className="text-3xl font-black tabular-nums text-stone-900">
                {n_exploitations ?? 0}
              </p>
            </div>

            {/* ZAAP / Pépinières */}
            <div className="border-l-4 border-stone-200 pl-3 py-2">
              <div className="flex items-center gap-1 text-xs text-stone-500 uppercase tracking-wide mb-1">
                <Building2 size={12} />
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
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">
                    {density.toFixed(2)}
                  </span>
                </div>
              )}

              {avg_distance_km !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Ruler size={14} className="text-stone-400" />
                    <span className="text-sm text-stone-600">
                      {t('map:prefecture_detail.avg_distance')}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
              {t('map:prefecture_detail.interpretation_title')}
            </p>
            <div className="bg-stone-50 border-l-4 border-stone-400 p-3 mt-2 text-sm text-stone-700 italic leading-relaxed">
              {interpretation}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
