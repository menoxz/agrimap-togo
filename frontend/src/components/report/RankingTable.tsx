import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';

interface PrefectureData {
  nom_prefecture: string;
  region: string;
  density_score: number;
  accessibility_score: number;
  coop_score: number;
  zaap_score: number;
  synthesis_score: number;
  priority_level: string;
}

interface RankingTableProps {
  prefectures: PrefectureData[];
  selectedPrefecture: string | null;
  onSelectPrefecture: (name: string) => void;
}

type SortField = keyof PrefectureData;
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = {
  critique: 0,
  'priorité haute': 1,
  'priorité moyenne': 2,
  'bien desservi': 3,
  'high priority': 1,
  'medium priority': 2,
  'well served': 3,
};

function getPriorityOrder(val: string): number {
  const lower = val.toLowerCase();
  for (const [key, order] of Object.entries(PRIORITY_ORDER)) {
    if (lower.includes(key)) return order;
  }
  return 99;
}

function getPriorityColor(val: string): string {
  const lower = val.toLowerCase();
  if (lower.includes('critique') || lower.includes('haute') || lower.includes('high'))
    return 'bg-red-100 text-red-800';
  if (lower.includes('moyenne') || lower.includes('medium'))
    return 'bg-amber-100 text-amber-800';
  if (lower.includes('bien') || lower.includes('well'))
    return 'bg-green-100 text-green-800';
  return 'bg-gray-100 text-gray-800';
}

function fmtNum(value: number): string {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  return parseFloat(value.toFixed(1)).toString();
}

const NUMERIC_FIELDS = new Set<SortField>([
  'density_score',
  'accessibility_score',
  'coop_score',
  'zaap_score',
  'synthesis_score',
]);

export default function RankingTable({
  prefectures,
  selectedPrefecture,
  onSelectPrefecture,
}: RankingTableProps) {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('synthesis_score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(NUMERIC_FIELDS.has(field) ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    let list = [...prefectures];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.nom_prefecture.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q),
      );
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let cmp: number;
      if (NUMERIC_FIELDS.has(sortField)) {
        cmp = (a[sortField] as number) - (b[sortField] as number);
      } else if (sortField === 'priority_level') {
        cmp = getPriorityOrder(a.priority_level) - getPriorityOrder(b.priority_level);
      } else {
        cmp = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      return cmp * dir;
    });

    return list;
  }, [prefectures, sortField, sortDir, search]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const columns: { field: SortField; labelKey: string; numeric: boolean }[] = [
    { field: 'synthesis_score', labelKey: 'report:table.synthesis', numeric: true },
    { field: 'density_score', labelKey: 'report:table.density', numeric: true },
    { field: 'accessibility_score', labelKey: 'report:table.access', numeric: true },
    { field: 'coop_score', labelKey: 'report:table.coop', numeric: true },
    { field: 'zaap_score', labelKey: 'report:table.zaap', numeric: true },
    { field: 'priority_level', labelKey: 'report:table.priority', numeric: false },
  ];

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('report:table.sort_hint')}
          className="w-full pl-9 pr-3 py-2 rounded-md border border-border text-body-sm bg-white
            placeholder:text-text-secondary focus:outline-2 focus:outline-primary focus:outline-offset-1"
        />
      </div>

      {/* Table wrapper for horizontal scroll on mobile */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-body-sm border-collapse">
          <thead>
            <tr className="bg-primary-light text-primary">
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap w-10">
                {t('report:table.rank')}
              </th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                {t('report:table.prefecture')}
              </th>
              <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                {t('report:table.region')}
              </th>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className="text-left px-3 py-2 font-semibold whitespace-nowrap cursor-pointer hover:bg-primary/10 select-none"
                  onClick={() => handleSort(col.field)}
                >
                  <span className="inline-flex items-center gap-1">
                    {t(col.labelKey)}
                    <SortIcon field={col.field} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((p, idx) => {
              const isSelected = p.nom_prefecture === selectedPrefecture;
              return (
                <tr
                  key={p.nom_prefecture}
                  onClick={() => onSelectPrefecture(p.nom_prefecture)}
                  className={[
                    'transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-surface-alt',
                  ].join(' ')}
                >
                  <td className="px-3 py-2 text-text-secondary font-mono text-body-xs">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 font-medium text-text">
                    {p.nom_prefecture}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {p.region}
                  </td>
                  {columns.map((col) => {
                    const val = p[col.field];
                    if (col.field === 'priority_level') {
                      return (
                        <td key={col.field} className="px-3 py-2">
                          <span
                            className={[
                              'inline-block px-2 py-0.5 rounded-full text-body-xs font-medium',
                              getPriorityColor(String(val)),
                            ].join(' ')}
                          >
                            {String(val)}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.field}
                        className={[
                          'px-3 py-2 font-mono',
                          col.numeric ? 'text-right' : '',
                          isSelected ? 'text-primary font-semibold' : 'text-text-secondary',
                        ].join(' ')}
                      >
                        {fmtNum(Number(val))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <p className="text-center text-body-sm text-text-secondary py-8">
          {t('report:table.no_data')}
        </p>
      )}

      <p className="text-body-xs text-text-secondary mt-2 text-right">
        {sorted.length} / {prefectures.length} préfectures
      </p>
    </div>
  );
}
