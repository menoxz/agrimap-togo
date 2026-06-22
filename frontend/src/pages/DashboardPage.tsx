import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Database,
  Filter,
  Gauge,
  Layers3,
  MapPinned,
  Search,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { TogoAccentBorder } from '@/components/ui/TogoAccentBorder';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useTranslation } from '@/hooks/useTranslation';
import type { GeoJsonFeatureCollection } from '@/types/map';

type MetricKey = 'need' | 'whiteZone' | 'service' | 'distance' | 'density' | 'coops';

interface PrefectureBI {
  name: string;
  region: string;
  need: number;
  whiteZone: number;
  service: number;
  distance: number;
  density: number;
  coops: number;
  zaap: number;
  access: number;
  synthesis: number;
  farms: number;
  markets: number;
  cooperatives: number;
}

interface RegionBI {
  region: string;
  count: number;
  need: number;
  whiteZone: number;
  service: number;
  distance: number;
  density: number;
  coops: number;
  zaap: number;
  access: number;
  farms: number;
  markets: number;
  cooperatives: number;
}

const DATA_URL = '/data/analysis/prefecture_synthesis.geojson';
const COLORS = ['#006A4E', '#FFD100', '#D21034', '#1565C0', '#E65100', '#7B1FA2'];

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function fmt(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function toBI(data: GeoJsonFeatureCollection | null): PrefectureBI[] {
  return (data?.features ?? [])
    .map((feature) => {
      const p = feature.properties ?? {};
      const synthesis = num(p.synthesis_score);
      return {
        name: String(p.nom_prefecture ?? p.name_en ?? 'Non renseigné'),
        region: String(p.region ?? 'Non renseigné'),
        need: clamp(100 - synthesis),
        whiteZone: clamp(num(p.white_zone_pct)),
        service: clamp(num(p.service_score)),
        distance: Math.max(0, num(p.avg_distance_km)),
        density: clamp(num(p.density_score)),
        coops: clamp(num(p.coop_score)),
        zaap: clamp(num(p.zaap_score)),
        access: clamp(num(p.accessibility_score)),
        synthesis,
        farms: num(p.n_exploitations),
        markets: num(p.n_marches),
        cooperatives: num(p.n_cooperatives),
      } satisfies PrefectureBI;
    })
    .filter((item) => item.name !== 'Non renseigné')
    .sort((a, b) => b.need - a.need);
}

function aggregateRegions(rows: PrefectureBI[]): RegionBI[] {
  const grouped = new Map<string, PrefectureBI[]>();
  for (const row of rows) {
    grouped.set(row.region, [...(grouped.get(row.region) ?? []), row]);
  }
  return [...grouped.entries()]
    .map(([region, list]) => ({
      region,
      count: list.length,
      need: avg(list.map((p) => p.need)),
      whiteZone: avg(list.map((p) => p.whiteZone)),
      service: avg(list.map((p) => p.service)),
      distance: avg(list.map((p) => p.distance)),
      density: avg(list.map((p) => p.density)),
      coops: avg(list.map((p) => p.coops)),
      zaap: avg(list.map((p) => p.zaap)),
      access: avg(list.map((p) => p.access)),
      farms: list.reduce((sum, p) => sum + p.farms, 0),
      markets: list.reduce((sum, p) => sum + p.markets, 0),
      cooperatives: list.reduce((sum, p) => sum + p.cooperatives, 0),
      totalAssets: list.reduce((sum, p) => sum + p.farms + p.markets + p.cooperatives, 0),
    }))
    .sort((a, b) => b.need - a.need);
}

function prioritySegments(rows: PrefectureBI[]): { region: string; critical: number; high: number; monitor: number; total: number }[] {
  const byRegion = new Map<string, { critical: number; high: number; monitor: number; total: number }>();
  for (const row of rows) {
    const entry = byRegion.get(row.region) ?? { critical: 0, high: 0, monitor: 0, total: 0 };
    if (row.need >= 80) entry.critical += 1;
    else if (row.need >= 65) entry.high += 1;
    else entry.monitor += 1;
    entry.total += 1;
    byRegion.set(row.region, entry);
  }
  return [...byRegion.entries()].map(([region, values]) => ({ region, ...values }));
}

function metricLabel(metric: MetricKey, lang: 'fr' | 'en'): string {
  const labels: Record<MetricKey, { fr: string; en: string }> = {
    need: { fr: 'Besoin prioritaire', en: 'Priority need' },
    whiteZone: { fr: 'Zones blanches', en: 'White zones' },
    service: { fr: 'Score services', en: 'Service score' },
    distance: { fr: 'Distance marché', en: 'Market distance' },
    density: { fr: 'Densité agricole', en: 'Farm density' },
    coops: { fr: 'Réseau coopératif', en: 'Cooperative network' },
  };
  return labels[metric][lang];
}

function metricUnit(metric: MetricKey): string {
  return metric === 'distance' ? 'km' : '/100';
}

function metricColor(metric: MetricKey): string {
  const colors: Record<MetricKey, string> = {
    need: '#D21034',
    whiteZone: '#E65100',
    service: '#006A4E',
    distance: '#1565C0',
    density: '#7B1FA2',
    coops: '#C7A700',
  };
  return colors[metric];
}

function metricDomain(metric: MetricKey, values: number[]): [number, number | 'auto'] {
  if (metric === 'distance') return [0, 'auto'];
  const max = Math.max(100, ...values);
  return [0, max];
}

function KpiCard({ icon: Icon, label, value, detail, tone }: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <Card padding="lg" className="relative overflow-hidden rounded-xl border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: tone }} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-caption font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 text-[2rem] font-black leading-none text-text">{value}</p>
          <p className="mt-2 text-body-sm text-text-secondary">{detail}</p>
        </div>
        <span className="rounded-lg p-3 text-white shadow-md" style={{ background: tone }}>
          <Icon size={22} />
        </span>
      </div>
    </Card>
  );
}

function MetricRegionChart({ regions, metric, lang }: { regions: RegionBI[]; metric: MetricKey; lang: 'fr' | 'en' }) {
  const label = metricLabel(metric, lang);
  const unit = metricUnit(metric);
  const color = metricColor(metric);
  const values = regions.map((region) => Number(region[metric] ?? 0));

  return (
    <div className="w-full overflow-x-auto">
      <BarChart width={820} height={360} data={regions} margin={{ top: 22, right: 28, left: 4, bottom: 8 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="region" tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
        <YAxis domain={metricDomain(metric, values)} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 12 }} />
        <Tooltip formatter={(value: unknown) => [`${fmt(Number(value ?? 0), metric === 'distance' ? 1 : 0)} ${unit}`, label]} cursor={{ fill: 'rgba(226,232,240,0.45)' }} />
        <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
        <Bar name={label} dataKey={metric} fill={color} radius={[6, 6, 0, 0]}>
          <LabelList dataKey={metric} position="top" formatter={(value: unknown) => fmt(Number(value ?? 0), metric === 'distance' ? 1 : 0)} className="fill-muted text-[11px]" />
        </Bar>
      </BarChart>
    </div>
  );
}

function PriorityStackedBars({ rows, lang }: { rows: PrefectureBI[]; lang: 'fr' | 'en' }) {
  const segments = prioritySegments(rows);
  const labels = {
    critical: lang === 'fr' ? 'Critique ≥80' : 'Critical ≥80',
    high: lang === 'fr' ? 'Prioritaire 65-79' : 'Priority 65-79',
    monitor: lang === 'fr' ? 'À surveiller' : 'Monitor',
  };

  return (
    <div className="w-full overflow-x-auto">
      <BarChart width={560} height={320} data={segments} layout="vertical" margin={{ top: 8, right: 28, left: 18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={{ stroke: '#CBD5E1' }} />
          <YAxis type="category" dataKey="region" width={80} tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value: unknown, name: unknown) => [fmt(Number(value ?? 0)), String(name)]} />
          <Legend verticalAlign="top" height={34} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
          <Bar name={labels.critical} dataKey="critical" stackId="priority" fill="#D21034" radius={[0, 0, 0, 0]}>
            <LabelList dataKey="critical" position="insideRight" formatter={(value: unknown) => (Number(value ?? 0) > 0 ? fmt(Number(value)) : '')} className="fill-white text-[10px] font-bold" />
          </Bar>
          <Bar name={labels.high} dataKey="high" stackId="priority" fill="#E65100" radius={[0, 0, 0, 0]}>
            <LabelList dataKey="high" position="insideRight" formatter={(value: unknown) => (Number(value ?? 0) > 0 ? fmt(Number(value)) : '')} className="fill-white text-[10px] font-bold" />
          </Bar>
          <Bar name={labels.monitor} dataKey="monitor" stackId="priority" fill="#FFD100" radius={[0, 6, 6, 0]}>
            <LabelList dataKey="monitor" position="insideRight" formatter={(value: unknown) => (Number(value ?? 0) > 0 ? fmt(Number(value)) : '')} className="fill-text text-[10px] font-bold" />
          </Bar>
        </BarChart>
    </div>
  );
}

function ServiceComposition({ regions, lang }: { regions: RegionBI[]; lang: 'fr' | 'en' }) {
  const label = {
    farms: lang === 'fr' ? 'Exploitations' : 'Farms',
    markets: lang === 'fr' ? 'Marchés' : 'Markets',
    coops: lang === 'fr' ? 'Coopératives' : 'Cooperatives',
  };

  return (
    <div className="w-full overflow-x-auto">
      <BarChart width={560} height={320} data={regions} layout="vertical" margin={{ top: 8, right: 28, left: 18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={{ stroke: '#CBD5E1' }} />
          <YAxis type="category" dataKey="region" width={80} tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value: unknown, name: unknown) => [fmt(Number(value ?? 0)), String(name)]} />
          <Legend verticalAlign="top" height={34} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
          <Bar name={label.farms} dataKey="farms" stackId="assets" fill="#1565C0" radius={[0, 0, 0, 0]} />
          <Bar name={label.markets} dataKey="markets" stackId="assets" fill="#006A4E" radius={[0, 0, 0, 0]} />
          <Bar name={label.coops} dataKey="cooperatives" stackId="assets" fill="#E65100" radius={[0, 6, 6, 0]}>
            <LabelList dataKey="totalAssets" position="right" formatter={(value: unknown) => fmt(Number(value ?? 0))} className="fill-muted text-[10px]" />
          </Bar>
        </BarChart>
    </div>
  );
}

function RegionDonut({
  regions,
  regionsLabel,
  prefecturesLabel,
}: {
  regions: RegionBI[];
  regionsLabel: string;
  prefecturesLabel: string;
}) {
  const total = Math.max(1, regions.reduce((sum, r) => sum + r.count, 0));
  let cursor = 0;
  const gradient = regions
    .map((region, index) => {
      const start = cursor;
      cursor += (region.count / total) * 100;
      return `${COLORS[index % COLORS.length]} ${start}% ${cursor}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-5 desktop:flex-row">
      <div className="relative h-52 w-52 shrink-0 rounded-full shadow-[0_24px_70px_rgba(30,41,59,0.18)]" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-8 grid place-items-center rounded-full bg-white text-center shadow-inner">
          <span className="text-caption font-bold uppercase tracking-widest text-muted">{regionsLabel}</span>
          <span className="text-h1 font-black text-primary">{regions.length}</span>
        </div>
      </div>
      <div className="grid w-full gap-3">
        {regions.map((region, index) => (
          <div key={region.region} className="flex items-center justify-between rounded-2xl border border-border bg-white/80 px-4 py-3">
            <span className="flex items-center gap-2 font-semibold text-text">
              <span className="h-3 w-3 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
              {region.region}
            </span>
            <span className="text-body-sm text-text-secondary">{region.count} {prefecturesLabel} · {fmt(region.need)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarRanking({ rows, metric, lang, onSelect }: {
  rows: PrefectureBI[];
  metric: MetricKey;
  lang: 'fr' | 'en';
  onSelect: (prefecture: PrefectureBI) => void;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row[metric]));
  return (
    <div className="space-y-3">
      {rows.slice(0, 10).map((row, index) => (
        <button
          key={row.name}
          onClick={() => onSelect(row)}
          className="group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-secondary"
        >
          <span className="font-mono text-body-sm font-bold text-muted">#{index + 1}</span>
          <span className="min-w-0">
            <span className="flex items-center justify-between gap-3">
              <span className="truncate font-semibold text-text">{row.name}</span>
              <span className="text-caption text-muted">{row.region}</span>
            </span>
            <span className="mt-2 block h-2 overflow-hidden rounded-full bg-surface-alt">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-togo-green via-togo-yellow to-togo-red transition-all duration-700"
                style={{ width: `${Math.max(4, (row[metric] / maxValue) * 100)}%` }}
              />
            </span>
          </span>
          <span className="font-mono text-body-sm font-bold text-primary">
            {fmt(row[metric], metric === 'distance' ? 1 : 0)} {metricUnit(metric)}
          </span>
        </button>
      ))}
      <p className="text-right text-caption text-muted">{metricLabel(metric, lang)} · Top 10</p>
    </div>
  );
}

function ScatterPlot({ rows, selected, onSelect, lang }: {
  rows: PrefectureBI[];
  selected: PrefectureBI | null;
  onSelect: (prefecture: PrefectureBI) => void;
  lang: 'fr' | 'en';
}) {
  const width = 520;
  const height = 280;
  const pad = 36;
  const xMax = Math.max(1, ...rows.map((p) => p.service));
  const yMax = Math.max(1, ...rows.map((p) => p.need));
  const x = (value: number) => pad + (value / xMax) * (width - pad * 2);
  const y = (value: number) => height - pad - (value / yMax) * (height - pad * 2);

  const axisNeed = lang === 'fr' ? 'Besoin ↑' : 'Need ↑';
  const axisServices = lang === 'fr' ? 'Services →' : 'Services →';
  const aria = lang === 'fr' ? 'Quadrant besoin services' : 'Need and services quadrant';

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={aria} className="min-w-[520px]">
        <defs>
          <linearGradient id="scatterBg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#D21034" stopOpacity="0.10" />
            <stop offset="52%" stopColor="#FFD100" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#006A4E" stopOpacity="0.10" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} rx="18" fill="url(#scatterBg)" />
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="#CBD5E1" />
        <line x1={pad} x2={pad} y1={pad} y2={height - pad} stroke="#CBD5E1" />
        <line x1={width / 2} x2={width / 2} y1={pad} y2={height - pad} stroke="#CBD5E1" strokeDasharray="5 5" />
        <line x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} stroke="#CBD5E1" strokeDasharray="5 5" />
        <text x={pad} y={22} className="fill-muted text-[11px] font-semibold">{axisNeed}</text>
        <text x={width - 132} y={height - 12} className="fill-muted text-[11px] font-semibold">{axisServices}</text>
        {rows.map((row) => {
          const isSelected = selected?.name === row.name;
          return (
            <circle
              key={row.name}
              cx={x(row.service)}
              cy={y(row.need)}
              r={isSelected ? 8 : 5}
              fill={isSelected ? '#D21034' : '#006A4E'}
              fillOpacity={isSelected ? 1 : 0.72}
              stroke="#fff"
              strokeWidth={isSelected ? 3 : 1.5}
              className="cursor-pointer transition-all hover:fill-[#D21034]"
              onClick={() => onSelect(row)}
            >
              <title>{row.name} : besoin {fmt(row.need)} / services {fmt(row.service)}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

function RegionMatrix({ regions, lang }: { regions: RegionBI[]; lang: 'fr' | 'en' }) {
  const columns: { key: keyof RegionBI; label: string; invert?: boolean }[] = [
    { key: 'need', label: lang === 'fr' ? 'Besoin' : 'Need' },
    { key: 'whiteZone', label: lang === 'fr' ? 'Zones blanches' : 'White zones' },
    { key: 'service', label: 'Services', invert: true },
    { key: 'coops', label: 'Coop.', invert: true },
    { key: 'access', label: lang === 'fr' ? 'Accès' : 'Access', invert: true },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-white/70 shadow-sm">
      <table className="w-full min-w-[620px] border-collapse text-body-sm">
        <thead>
          <tr className="bg-primary-light text-primary">
            <th className="px-4 py-3 text-left font-bold">{lang === 'fr' ? 'Région' : 'Region'}</th>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left font-bold">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {regions.map((region) => (
            <tr key={region.region} className="hover:bg-surface-alt/80">
              <td className="px-4 py-3 font-bold text-text">{region.region}</td>
              {columns.map((column) => {
                const raw = Number(region[column.key] ?? 0);
                const heat = column.invert ? 100 - raw : raw;
                return (
                  <td key={column.key} className="px-4 py-3">
                    <span
                      className="inline-flex min-w-16 justify-center rounded-full px-3 py-1 font-mono font-bold"
                      style={{
                        background: `rgba(${heat > 70 ? '210,16,52' : heat > 45 ? '255,209,0' : '0,106,78'}, 0.16)`,
                        color: heat > 70 ? '#A00D29' : heat > 45 ? '#7A4A00' : '#006A4E',
                      }}
                    >
                      {fmt(raw)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { currentLang } = useTranslation();
  const lang = currentLang === 'fr' ? 'fr' : 'en';
  const { data, loading, error } = useDataLoader(DATA_URL);
  const [region, setRegion] = useState('all');
  const [metric, setMetric] = useState<MetricKey>('need');
  const [query, setQuery] = useState('');
  const [threshold, setThreshold] = useState(60);
  const [selected, setSelected] = useState<PrefectureBI | null>(null);

  const rows = useMemo(() => toBI(data), [data]);
  const regions = useMemo(() => aggregateRegions(rows), [rows]);
  const regionNames = useMemo(() => regions.map((item) => item.region), [regions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchRegion = region === 'all' || row.region === region;
      const matchQuery = !q || row.name.toLowerCase().includes(q) || row.region.toLowerCase().includes(q);
      return matchRegion && matchQuery && row.need >= threshold;
    });
  }, [query, region, rows, threshold]);

  const activeRows = filtered;
  const activeRegions = useMemo(() => aggregateRegions(activeRows), [activeRows]);
  const highlighted = activeRows.find((row) => row.name === selected?.name) ?? activeRows[0] ?? null;
  const totals = useMemo(() => ({
    critical: activeRows.filter((row) => row.need >= 70).length,
    avgNeed: avg(activeRows.map((row) => row.need)),
    avgDistance: avg(activeRows.map((row) => row.distance)),
    farms: activeRows.reduce((sum, row) => sum + row.farms, 0),
    services: activeRows.reduce((sum, row) => sum + row.markets + row.cooperatives, 0),
  }), [activeRows]);

  const sortedByMetric = useMemo(() => [...activeRows].sort((a, b) => b[metric] - a[metric]), [activeRows, metric]);

  const copy = {
    eyebrow: lang === 'fr' ? 'Centre de pilotage BI' : 'BI command center',
    title: lang === 'fr' ? 'Dashboard analytique des zones agricoles prioritaires' : 'Analytics dashboard for priority agricultural zones',
    subtitle: lang === 'fr'
      ? 'Une vue exécutive interactive pour comprendre les besoins, comparer les régions et prioriser les interventions agricoles au Togo.'
      : 'An interactive executive view to understand gaps, compare regions and prioritize agricultural interventions in Togo.',
    filters: lang === 'fr' ? 'Filtres de pilotage' : 'Control filters',
    region: lang === 'fr' ? 'Région' : 'Region',
    allRegions: lang === 'fr' ? 'Toutes les régions' : 'All regions',
    metric: lang === 'fr' ? 'Indicateur' : 'Metric',
    threshold: lang === 'fr' ? 'Seuil de besoin minimal' : 'Minimum need threshold',
    search: lang === 'fr' ? 'Rechercher une préfecture…' : 'Search a prefecture…',
    loading: lang === 'fr' ? 'Chargement du cockpit analytique…' : 'Loading analytics cockpit…',
    noData: lang === 'fr' ? 'Aucune donnée ne correspond aux filtres.' : 'No data matches the filters.',
    prefectures: lang === 'fr' ? 'préfectures' : 'prefectures',
    regions: lang === 'fr' ? 'régions' : 'regions',
    dataFreshness: lang === 'fr' ? 'Données · juin 2026' : 'Data · June 2026',
    signal: lang === 'fr' ? 'Signal prioritaire' : 'Priority signal',
    highlightedHint: lang === 'fr' ? 'préfecture à surveiller dans le filtre actif' : 'prefecture to monitor in active filter',
    searchLabel: lang === 'fr' ? 'Recherche' : 'Search',
    avgNeed: lang === 'fr' ? 'Besoin moyen' : 'Average need',
    visiblePrefectures: lang === 'fr' ? 'préfectures dans la vue' : 'prefectures in view',
    criticalZones: lang === 'fr' ? 'Zones critiques' : 'Critical zones',
    criticalRule: lang === 'fr' ? 'Besoin ≥ 70/100' : 'Need ≥ 70/100',
    avgDistance: lang === 'fr' ? 'Distance moyenne' : 'Average distance',
    marketDistance: lang === 'fr' ? 'Distance moyenne aux marchés' : 'Average distance to markets',
    assets: lang === 'fr' ? 'Actifs recensés' : 'Tracked assets',
    farms: lang === 'fr' ? 'exploitations' : 'farms',
    services: lang === 'fr' ? 'services' : 'services',
    servicesLabel: lang === 'fr' ? 'Services' : 'Services',
    whiteZonesShort: lang === 'fr' ? 'Zones blanches' : 'White zones',
    ranking: lang === 'fr' ? 'Ranking dynamique' : 'Dynamic ranking',
    topZones: lang === 'fr' ? 'Top zones par' : 'Top zones by',
    regionalPortfolio: lang === 'fr' ? 'Portefeuille régional' : 'Regional portfolio',
    distribution: lang === 'fr' ? 'Répartition territoriale' : 'Territorial distribution',
    quadrant: lang === 'fr' ? "Quadrant d'arbitrage" : 'Decision quadrant',
    quadrantTitle: lang === 'fr' ? 'Besoin prioritaire × niveau de services' : 'Priority need × service level',
    clickHint: lang === 'fr' ? 'Cliquez un point ou une ligne pour isoler une préfecture.' : 'Click a point or row to isolate a prefecture.',
    clustered: lang === 'fr' ? 'Graphique par indicateur' : 'Metric chart',
    clusteredTitle: lang === 'fr' ? `Analyse régionale : ${metricLabel(metric, lang)}` : `Regional analysis: ${metricLabel(metric, lang)}`,
    stacked: lang === 'fr' ? 'Barres empilées' : 'Stacked bars',
    stackedTitle: lang === 'fr' ? 'Répartition des niveaux de priorité' : 'Priority level distribution',
    composition: lang === 'fr' ? 'Composition des actifs' : 'Asset composition',
    compositionTitle: lang === 'fr' ? 'Exploitations, marchés et coopératives' : 'Farms, markets and cooperatives',
    heatmap: lang === 'fr' ? 'Heatmap décisionnelle' : 'Decision heatmap',
    regionComparison: lang === 'fr' ? 'Comparaison des régions' : 'Regional comparison',
    table: lang === 'fr' ? 'Tableau exploitable' : 'Actionable table',
    filteredPrefectures: lang === 'fr' ? 'Préfectures filtrées' : 'Filtered prefectures',
    prefecture: lang === 'fr' ? 'Préfecture' : 'Prefecture',
    need: lang === 'fr' ? 'Besoin' : 'Need',
    whiteZones: lang === 'fr' ? 'Zones blanches' : 'White zones',
    distance: lang === 'fr' ? 'Distance' : 'Distance',
    markets: lang === 'fr' ? 'Marchés' : 'Markets',
    coops: lang === 'fr' ? 'Coop.' : 'Coop.',
    rowLimit: lang === 'fr'
      ? 'Vue limitée aux 18 premières lignes du filtre actif pour conserver une lecture claire.'
      : 'View limited to the first 18 rows of the active filter to keep the table readable.',
  };

  if (loading) {
    return <div className="container-page py-16 text-center text-text-secondary">{copy.loading}</div>;
  }

  if (error) {
    return <div className="container-page py-16 text-center text-error">{error}</div>;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-bg togo-section-bg">
      <section
        className="relative min-h-[calc(82vh-4rem)] overflow-hidden border-b border-black/20"
        style={{
          backgroundImage: 'url(/images/banner-farming.jpg)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/62 to-black/78" aria-hidden="true" />
        <div className="hero-motion-bg" aria-hidden="true" />
        <div className="absolute inset-0 opacity-25 mix-blend-screen" aria-hidden="true">
          <div className="absolute left-[10%] top-[22%] h-32 w-32 rounded-full border border-togo-yellow/60 animate-hero-orbit" style={{ animationDelay: '120ms' }} />
          <div className="absolute right-[14%] top-[30%] h-24 w-24 rounded-full border border-togo-red/60 animate-hero-orbit" style={{ animationDelay: '260ms' }} />
          <div className="absolute bottom-[18%] left-[48%] h-40 w-40 rounded-full border border-white/35 animate-hero-orbit" style={{ animationDelay: '380ms' }} />
        </div>

        <div className="container-page relative z-10 grid min-h-[calc(82vh-4rem)] items-center gap-10 py-12 desktop:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl text-white">
            <Badge variant="primary" size="md" icon={Sparkles} className="mb-5 bg-[#092E25]/95 text-togo-yellow shadow-lg shadow-black/25 ring-1 ring-togo-yellow/45 backdrop-blur-sm">
              {copy.eyebrow}
            </Badge>
            <h1 className="text-[2.35rem] font-black leading-[1.04] tracking-[-0.04em] text-white drop-shadow-2xl tablet:text-[3.25rem] desktop:text-[4.2rem] animate-hero-word">
              {copy.title}
            </h1>
            <div className="mt-5 animate-fade-in" style={{ animationDelay: '220ms' }}>
              <TogoAccentBorder width="short" />
            </div>
            <p className="mt-5 max-w-2xl text-body-lg text-white/82 drop-shadow animate-hero-word" style={{ animationDelay: '320ms' }}>{copy.subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3 text-body-sm text-white/80 animate-cta-pop" style={{ animationDelay: '460ms' }}>
              <span className="rounded-full bg-white/12 px-4 py-2 shadow-sm ring-1 ring-white/20">{rows.length} {copy.prefectures}</span>
              <span className="rounded-full bg-white/12 px-4 py-2 shadow-sm ring-1 ring-white/20">{regions.length} {copy.regions}</span>
              <span className="rounded-full bg-white/12 px-4 py-2 shadow-sm ring-1 ring-white/20">{copy.dataFreshness}</span>
            </div>
          </div>

          <Card padding="lg" className="relative overflow-hidden rounded-[1.5rem] border-white/25 bg-black/35 text-white shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-md animate-map-reveal">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-togo-green via-togo-yellow to-togo-red" />
            <div className="relative grid gap-5">
              <p className="text-caption font-bold uppercase tracking-[0.22em] text-white/65">{copy.signal}</p>
              <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-6">
                <div className="grid h-36 w-36 place-items-center rounded-full bg-[conic-gradient(#D21034_0_77%,rgba(255,255,255,0.22)_77%_100%)] p-3 shadow-2xl">
                  <div className="grid h-full w-full place-items-center rounded-full bg-[#092E25] text-center shadow-inner">
                    <span className="text-[2.2rem] font-black text-white">{fmt(totals.avgNeed)}</span>
                    <span className="-mt-4 text-caption uppercase tracking-widest text-white/55">/100</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-h2 font-black text-white">{highlighted?.name ?? 'Non renseigné'}</h2>
                  <p className="mt-2 text-white/72">{highlighted?.region ?? 'Non renseigné'} · {copy.highlightedHint}</p>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-caption">
                    <span className="rounded-lg bg-white/12 px-2 py-2 text-white ring-1 ring-white/15"><strong className="block text-body-sm text-togo-yellow">{fmt(highlighted?.whiteZone ?? 0)}%</strong>{copy.whiteZonesShort}</span>
                    <span className="rounded-lg bg-white/12 px-2 py-2 text-white ring-1 ring-white/15"><strong className="block text-body-sm text-togo-yellow">{fmt(highlighted?.service ?? 0)}</strong>{copy.servicesLabel}</span>
                    <span className="rounded-lg bg-white/12 px-2 py-2 text-white ring-1 ring-white/15"><strong className="block text-body-sm text-togo-yellow">{fmt(highlighted?.distance ?? 0, 1)}km</strong>{copy.distance}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-togo-green via-togo-yellow to-togo-red" aria-hidden="true" />
      </section>

      <div className="container-page pb-16 pt-6">
        <Card padding="lg" className="relative z-10 rounded-xl border-border bg-white shadow-md">
          <div className="mb-5 flex items-center gap-2 text-primary">
            <Filter size={18} />
            <h2 className="text-label uppercase tracking-[0.18em]">{copy.filters}</h2>
          </div>
          <div className="grid gap-4 desktop:grid-cols-[1fr_1fr_1.2fr_1fr]">
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-text-secondary">{copy.region}</span>
              <select value={region} onChange={(event) => setRegion(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-white px-4 text-body-sm focus:outline-2 focus:outline-primary">
                <option value="all">{copy.allRegions}</option>
                {regionNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-text-secondary">{copy.metric}</span>
              <select value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)} className="h-12 w-full rounded-xl border border-border bg-white px-4 text-body-sm focus:outline-2 focus:outline-primary">
                {(['need', 'whiteZone', 'service', 'distance', 'density', 'coops'] as MetricKey[]).map((key) => (
                  <option key={key} value={key}>{metricLabel(key, lang)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="flex items-center justify-between text-body-sm font-semibold text-text-secondary">
                {copy.threshold}<strong className="text-primary">{threshold}/100</strong>
              </span>
              <input type="range" min="0" max="95" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="h-12 w-full accent-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-text-secondary">{copy.searchLabel}</span>
              <span className="relative block">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-body-sm focus:outline-2 focus:outline-primary" />
              </span>
            </label>
          </div>
        </Card>

        <div className="mt-8 grid gap-5 tablet:grid-cols-2 desktop:grid-cols-4">
          <KpiCard icon={Gauge} label={copy.avgNeed} value={`${fmt(totals.avgNeed)}/100`} detail={`${activeRows.length} ${copy.visiblePrefectures}`} tone="#006A4E" />
          <KpiCard icon={Target} label={copy.criticalZones} value={fmt(totals.critical)} detail={copy.criticalRule} tone="#D21034" />
          <KpiCard icon={MapPinned} label={copy.avgDistance} value={`${fmt(totals.avgDistance, 1)} km`} detail={copy.marketDistance} tone="#1565C0" />
          <KpiCard icon={Database} label={copy.assets} value={fmt(totals.farms + totals.services)} detail={`${fmt(totals.farms)} ${copy.farms} · ${fmt(totals.services)} ${copy.services}`} tone="#E65100" />
        </div>

        {activeRows.length === 0 ? (
          <Card padding="lg" className="mt-8 text-center text-text-secondary">{copy.noData}</Card>
        ) : (
          <div className="mt-8 grid gap-6 desktop:grid-cols-2">
            <Card padding="lg" className="rounded-xl bg-white shadow-md desktop:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.2em] text-muted">{copy.clustered}</p>
                  <h2 className="mt-1 text-h2 font-black text-text">{copy.clusteredTitle}</h2>
                </div>
                <BarChart3 className="text-primary" />
              </div>
              <MetricRegionChart regions={activeRegions} metric={metric} lang={lang} />
            </Card>

            <Card padding="lg" className="rounded-xl bg-white shadow-md">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.2em] text-muted">{copy.stacked}</p>
                  <h2 className="mt-1 text-h2 font-black text-text">{copy.stackedTitle}</h2>
                </div>
                <Target className="text-togo-red" />
              </div>
              <PriorityStackedBars rows={activeRows} lang={lang} />
            </Card>

            <Card padding="lg" className="rounded-xl bg-white shadow-md">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.2em] text-muted">{copy.composition}</p>
                  <h2 className="mt-1 text-h2 font-black text-text">{copy.compositionTitle}</h2>
                </div>
                <Layers3 className="text-accent" />
              </div>
              <ServiceComposition regions={activeRegions} lang={lang} />
            </Card>

            <Card padding="lg" className="rounded-xl bg-white shadow-md">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.2em] text-muted">{copy.ranking}</p>
                  <h2 className="mt-1 text-h2 font-black text-text">{copy.topZones} {metricLabel(metric, lang).toLowerCase()}</h2>
                </div>
                <BarChart3 className="text-primary" />
              </div>
              <BarRanking rows={sortedByMetric} metric={metric} lang={lang} onSelect={setSelected} />
            </Card>

            <Card padding="lg" className="rounded-xl bg-white shadow-md">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.2em] text-muted">{copy.heatmap}</p>
                  <h2 className="mt-1 text-h2 font-black text-text">{copy.regionComparison}</h2>
                </div>
                <Activity className="text-togo-red" />
              </div>
              <RegionMatrix regions={activeRegions} lang={lang} />
            </Card>

            <Card padding="lg" className="rounded-xl bg-white shadow-md desktop:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.2em] text-muted">{copy.table}</p>
                  <h2 className="mt-1 text-h2 font-black text-text">{copy.filteredPrefectures}</h2>
                </div>
                <Table2 className="text-secondary" />
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/60 shadow-sm">
                <table className="w-full min-w-[820px] border-collapse text-body-sm">
                  <thead className="bg-[#0B3D2E] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">{copy.prefecture}</th>
                      <th className="px-4 py-3 text-left">{copy.region}</th>
                      <th className="px-4 py-3 text-right">{copy.need}</th>
                      <th className="px-4 py-3 text-right">{copy.whiteZones}</th>
                      <th className="px-4 py-3 text-right">{copy.servicesLabel}</th>
                      <th className="px-4 py-3 text-right">{copy.distance}</th>
                      <th className="px-4 py-3 text-right">{copy.markets}</th>
                      <th className="px-4 py-3 text-right">{copy.coops}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {activeRows.slice(0, 18).map((row) => (
                      <tr key={row.name} onClick={() => setSelected(row)} className="cursor-pointer transition-colors hover:bg-primary-light/60">
                        <td className="px-4 py-3 font-bold text-text">{row.name}</td>
                        <td className="px-4 py-3 text-text-secondary">{row.region}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-togo-red">{fmt(row.need)}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(row.whiteZone)}%</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(row.service)}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(row.distance, 1)} km</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(row.markets)}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(row.cooperatives)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex items-center gap-2 text-caption text-muted"><TrendingUp size={14} /> {copy.rowLimit}</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
