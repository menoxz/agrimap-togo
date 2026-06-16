import { useState, useMemo } from 'react';
import { ListOrdered, MapPin, Filter } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import Badge from '@/components/ui/Badge';
import { useDataLoader } from '@/hooks/useDataLoader';
import type { GeoJsonFeature, GeoJsonPropertyMap } from '@/types/map';

// ── Types ──────────────────────────────────────────────────────────────────
interface TopZonesListProps {
  /** Optional external data — if omitted, fetches /data/synthesis.geojson */
  zones?: GeoJsonFeature[];
  selectedZoneId?: string | number;
  onZoneSelect: (properties: GeoJsonPropertyMap) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const DATA_URL = '/data/synthesis.geojson';

// ── Helpers ────────────────────────────────────────────────────────────────
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

function getScoreColor(score: number): string {
  if (score < 0.2) return '#D73027';
  if (score < 0.4) return '#FC8D59';
  if (score < 0.6) return '#FEE08B';
  if (score < 0.8) return '#91CF60';
  return '#1A9850';
}

function getPriorityVariant(
  score: number,
): 'error' | 'warning' | 'info' | 'success' {
  if (score < 0.2) return 'error';
  if (score < 0.4) return 'warning';
  if (score < 0.6) return 'info';
  return 'success';
}

function getPriorityLabel(score: number): string {
  if (score < 0.2) return 'Priorité maximale';
  if (score < 0.4) return 'Prioritaire';
  if (score < 0.6) return 'Surveillance';
  if (score < 0.8) return 'Bien desservi';
  return 'Très bien desservi';
}

/**
 * Format zone name from properties — tries multiple keys.
 */
function getZoneName(props: GeoJsonPropertyMap): string {
  return (
    safeStr(props.nom_zone || props.zone || props.nom_region || props.region) || 'Zone'
  );
}

function getRegion(props: GeoJsonPropertyMap): string {
  return safeStr(props.nom_region || props.region) || '';
}

// ── List item sub-component ────────────────────────────────────────────────
function ZoneListItem({
  props,
  rank,
  score,
  isSelected,
  onSelect,
}: {
  props: GeoJsonPropertyMap;
  rank: number;
  score: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const zoneName = getZoneName(props);
  const region = getRegion(props);
  const pct = Math.round(score * 100);
  const variant = getPriorityVariant(score);
  const label = getPriorityLabel(score);
  const scoreColor = getScoreColor(score);

  return (
    <button
      onClick={onSelect}
      className={[
        'w-full text-left px-3 py-2.5 rounded-md transition-colors border',
        isSelected
          ? 'bg-primary-light/10 border-primary/30 shadow-sm'
          : 'bg-white border-transparent hover:bg-surface-alt hover:border-border/50',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-body-xs font-bold text-text-secondary mt-0.5">
          {rank}
        </div>

        {/* Zone info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-body-sm font-semibold text-text truncate">
              {zoneName}
            </span>
            <Badge variant={variant} size="sm">
              {label}
            </Badge>
          </div>

          {region && (
            <p className="text-caption text-muted mt-0.5 flex items-center gap-1">
              <MapPin size={10} />
              {region}
            </p>
          )}

          {/* Score bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: scoreColor }}
              />
            </div>
            <span className="text-body-xs font-semibold text-text-secondary shrink-0 tabular-nums">
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
/**
 * TopZonesList — Ranked list of priority zones.
 * Displays zones sorted by `rang` (ascending), with score bars,
 * priority badges, and region filter.
 *
 * Clicking a zone calls `onZoneSelect` with its properties.
 * A region filter dropdown lets users narrow down by region.
 */
export default function TopZonesList({
  zones: externalZones,
  selectedZoneId,
  onZoneSelect,
}: TopZonesListProps) {
  const { t } = useTranslation();
  const { data, loading, error } = useDataLoader(externalZones ? null : DATA_URL);
  const [regionFilter, setRegionFilter] = useState('');

  // Use external zones if provided, otherwise use loaded data
  const allZones = externalZones ?? data?.features ?? [];

  // Extract unique regions
  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const f of allZones) {
      const r = getRegion(f.properties);
      if (r) set.add(r);
    }
    return Array.from(set).sort();
  }, [allZones]);

  // Sort by rang, filter by region
  const sortedZones = useMemo(() => {
    let list = [...allZones];

    // Filter by region
    if (regionFilter) {
      const lower = regionFilter.toLowerCase();
      list = list.filter((f) => getRegion(f.properties).toLowerCase() === lower);
    }

    // Sort by synthesis_class ascending (lower class = higher priority)
    list.sort((a, b) => {
      const ra = safeNum(a.properties.synthesis_class);
      const rb = safeNum(b.properties.synthesis_class);
      return ra - rb;
    });

    return list;
  }, [allZones, regionFilter]);

  // Compute selected zone identifier
  const selectedKey = selectedZoneId != null ? String(selectedZoneId) : null;

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-20 bg-gray-50 rounded animate-pulse" />
        <div className="h-20 bg-gray-50 rounded animate-pulse" />
        <div className="h-20 bg-gray-50 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-body-sm text-error px-3 py-2 bg-red-50 rounded-md">
        ⚠ Erreur: {error}
      </div>
    );
  }

  if (allZones.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListOrdered size={18} className="text-primary" />
          <h3 className="text-h3 font-bold text-text">
            {t('map:top_zones.title')}
          </h3>
        </div>
        {sortedZones.length > 0 && (
          <span className="text-caption text-muted">
            {sortedZones.length} résultat{sortedZones.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <p className="text-body-sm text-text-secondary mb-3">
        {t('map:top_zones.subtitle')}
      </p>

      {/* Region filter */}
      {regions.length > 1 && (
        <div className="mb-3">
          <label className="text-caption text-muted font-medium flex items-center gap-1 mb-1">
            <Filter size={12} />
            {t('map:top_zones.filter_region')}
          </label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full text-body-sm rounded-md border border-border bg-white px-2 py-1.5 text-text focus:outline-2 focus:outline-primary"
          >
            <option value="">{t('map:top_zones.all_regions')}</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hint */}
      <p className="text-caption text-muted mb-2 flex items-center gap-1">
        <MapPin size={10} />
        {t('map:top_zones.select_hint')}
      </p>

      {/* List */}
      {sortedZones.length === 0 ? (
        <div className="text-body-sm text-text-secondary px-3 py-6 text-center bg-surface-alt/50 rounded-md">
          {t('map:top_zones.no_zones')}
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
          {sortedZones.map((feature, idx) => {
            const props = feature.properties;
            const rank = safeNum(props.synthesis_class) || idx + 1;
            // GeoJSON scores are 0-100; normalize to 0-1 for color/badge helpers
            const score = safeNum(props.synthesis_score) / 100;
            const id = props.id ?? props.synthesis_class ?? idx;

            return (
              <ZoneListItem
                key={String(id)}
                props={props}
                rank={rank}
                score={score}
                isSelected={selectedKey === String(id)}
                onSelect={() => onZoneSelect(props)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
