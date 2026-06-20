import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import {
  FileText,
  Download,
  Link,
  CheckCircle,
  ChevronRight,
  BookOpen,
  Database,
  BarChart3,
  AlertTriangle,
  Target,
  List,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useDataLoader } from '@/hooks/useDataLoader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import RadarChart from '@/components/report/RadarChart';
import RankingTable from '@/components/report/RankingTable';
import type { GeoJsonFeatureCollection } from '@/types/map';

interface TocItem {
  id: string;
  label: string;
  icon: typeof FileText;
  children?: TocItem[];
}

export default function ReportPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('');
  const [copied, setCopied] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const tocItems: TocItem[] = [
    { id: 'approach', label: t('report.sections.approach'), icon: BookOpen },
    { id: 'sources', label: t('report.sections.sources'), icon: Database },
    {
      id: 'quality',
      label: t('report.sections.quality'),
      icon: BarChart3,
      children: [
        { id: 'completeness', label: t('report.sections.completeness'), icon: FileText },
        { id: 'precision', label: t('report.sections.precision'), icon: FileText },
      ],
    },
    {
      id: 'analyses',
      label: t('report.sections.analyses'),
      icon: Target,
    },
    { id: 'comparative', label: t('report.sections.comparative'), icon: BarChart3 },
    { id: 'limits', label: t('report.sections.limits'), icon: AlertTriangle },
    { id: 'conclusion', label: t('report.sections.conclusion'), icon: CheckCircle },
  ];

  const narrativeItems = [
    { id: 'approach', label: t('report.sections.approach'), eyebrow: t('report:narrative.steps.approach'), icon: BookOpen, color: '#006A4E' },
    { id: 'sources', label: t('report.sections.sources'), eyebrow: t('report:narrative.steps.sources'), icon: Database, color: '#1565C0' },
    { id: 'quality', label: t('report.sections.quality'), eyebrow: t('report:narrative.steps.quality'), icon: BarChart3, color: '#FFD100' },
    { id: 'analyses', label: t('report.sections.analyses'), eyebrow: t('report:narrative.steps.analyses'), icon: Target, color: '#E65100' },
    { id: 'comparative', label: t('report.sections.comparative'), eyebrow: t('report:narrative.steps.comparative'), icon: BarChart3, color: '#D21034' },
    { id: 'limits', label: t('report.sections.limits'), eyebrow: t('report:narrative.steps.limits'), icon: AlertTriangle, color: '#9A3412' },
    { id: 'conclusion', label: t('report.sections.conclusion'), eyebrow: t('report:narrative.steps.conclusion'), icon: CheckCircle, color: '#166534' },
  ];

  const sectionParentMap: Record<string, string> = {
    completeness: 'quality',
    precision: 'quality',
  };

  const activeNarrativeId = sectionParentMap[activeSection] ?? activeSection;
  const activeNarrativeIndex = Math.max(0, narrativeItems.findIndex((item) => item.id === activeNarrativeId));
  const accentStyle = (color: string): CSSProperties => ({ '--story-accent': color } as CSSProperties);

  useEffect(() => {
    const flattenIds = (items: TocItem[]): string[] => {
      return items.flatMap((item) => [item.id, ...(item.children ? flattenIds(item.children) : [])]);
    };

    const sectionIds = flattenIds(tocItems);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('report-visible');
          }
        });

        const intersecting = entries.filter((entry) => entry.isIntersecting);
        if (intersecting.length === 0) {
          return;
        }

        const bestEntry = intersecting.reduce((best, current) => {
          const bestTop = Math.abs(best.boundingClientRect.top);
          const currentTop = Math.abs(current.boundingClientRect.top);
          return currentTop < bestTop ? current : best;
        });

        setActiveSection(bestEntry.target.id);
      },
      { rootMargin: '-100px 0px -60% 0px' },
    );

    for (const id of sectionIds) {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    }

    const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (hashId) {
      const target = document.getElementById(hashId);
      if (target) {
        target.scrollIntoView({ behavior: 'auto' });
        setActiveSection(hashId);
      }
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateProgress = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / max) * 100)));
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  // ── Comparative analysis data ──
  const DATA_URL = '/data/analysis/prefecture_synthesis.geojson';
  const { data: synthesisData, loading: synthLoading } = useDataLoader(DATA_URL);

  const prefectures = useMemo(() => {
    if (!synthesisData) return [];
    return synthesisData.features
      .filter((f) => f.properties?.nom_prefecture)
      .map((f) => ({
        nom_prefecture: String(f.properties.nom_prefecture),
        region: String(f.properties.region ?? ''),
        density_score: Number(f.properties.density_score ?? 0),
        accessibility_score: Number(f.properties.accessibility_score ?? 0),
        coop_score: Number(f.properties.coop_score ?? 0),
        zaap_score: Number(f.properties.zaap_score ?? 50),
        synthesis_score: Number(f.properties.synthesis_score ?? 0),
        priority_level: String(f.properties.priority_level ?? ''),
      }))
      .sort((a, b) => a.synthesis_score - b.synthesis_score);
  }, [synthesisData]);

  // Compute regional averages
  const regionAveragesMap = useMemo(() => {
    const map = new Map<string, { density: number[]; access: number[]; coop: number[]; zaap: number[] }>();
    for (const p of prefectures) {
      if (!map.has(p.region)) map.set(p.region, { density: [], access: [], coop: [], zaap: [] });
      const entry = map.get(p.region)!;
      entry.density.push(p.density_score);
      entry.access.push(p.accessibility_score);
      entry.coop.push(p.coop_score);
      entry.zaap.push(p.zaap_score);
    }
    const avgMap = new Map<string, { density_score: number; accessibility_score: number; coop_score: number; zaap_score: number }>();
    for (const [region, vals] of map.entries()) {
      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
      avgMap.set(region, {
        density_score: Math.round(avg(vals.density)),
        accessibility_score: Math.round(avg(vals.access)),
        coop_score: Math.round(avg(vals.coop)),
        zaap_score: Math.round(avg(vals.zaap)),
      });
    }
    return avgMap;
  }, [prefectures]);

  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);

  const currentPref = useMemo(() => {
    if (!selectedPrefecture) return prefectures.length > 0 ? prefectures[0] : null;
    return prefectures.find((p) => p.nom_prefecture === selectedPrefecture) ?? prefectures[0] ?? null;
  }, [prefectures, selectedPrefecture]);

  const regionAvg = useMemo(() => {
    if (!currentPref) return { density_score: 0, accessibility_score: 0, coop_score: 0, zaap_score: 0 };
    return regionAveragesMap.get(currentPref.region) ?? { density_score: 0, accessibility_score: 0, coop_score: 0, zaap_score: 0 };
  }, [currentPref, regionAveragesMap]);

  // Set initial selection when data loads
  useEffect(() => {
    if (prefectures.length > 0 && !selectedPrefecture) {
      setSelectedPrefecture(prefectures[0].nom_prefecture);
    }
  }, [prefectures, selectedPrefecture]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      const newUrl = `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`;
      window.history.replaceState(window.history.state, '', newUrl);
      setActiveSection(id);
    }
    setTocOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const exportPdf = () => {
    window.print();
  };

  const renderTocItem = (item: TocItem, depth = 0) => {
    const isActive = activeSection === item.id;
    const Icon = item.icon;
    return (
      <div key={item.id}>
        <button
          onClick={() => scrollTo(item.id)}
          data-target={item.id}
          className={[
            'w-full flex items-center gap-2 px-3 py-2 text-left text-body-sm rounded-md transition-colors',
            'focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2',
            isActive
              ? 'bg-primary-light text-primary font-medium'
              : 'text-text-secondary hover:bg-surface-alt hover:text-text',
          ].join(' ')}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <Icon size={16} className="shrink-0" />
          <span>{item.label}</span>
        </button>
        {item.children?.map((child) => renderTocItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <div className="fixed left-0 right-0 top-16 z-40 h-1 bg-transparent no-print" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-togo-green via-togo-yellow to-togo-red transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="container-page py-6 tablet:py-8">
        {/* Header */}
        <header className="report-hero relative overflow-hidden rounded-[2rem] border border-white/50 bg-gradient-to-br from-[#003D24] via-[#006A4E] to-[#0A1628] p-6 tablet:p-8 desktop:p-10 text-white shadow-[0_30px_90px_rgba(30,41,59,0.22)] mb-8">
          <div className="absolute inset-0 opacity-50" aria-hidden="true">
            <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-togo-yellow/20 blur-3xl animate-hero-glow" />
            <div className="absolute right-8 bottom-4 h-40 w-40 rounded-full bg-togo-red/20 blur-3xl animate-hero-glow" style={{ animationDelay: '900ms' }} />
          </div>

          <div className="relative z-10 grid gap-8 desktop:grid-cols-[1fr_320px] desktop:items-end">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 animate-fade-in">
                <BookOpen size={14} />
                {t('report:narrative.eyebrow')}
              </span>
              <h1 className="mt-5 text-[2.5rem] tablet:text-[3.6rem] font-black leading-[1.02] tracking-[-0.05em] text-balance animate-hero-word">
                {t('report.title')}
              </h1>
              <p className="mt-4 max-w-2xl text-body-lg text-white/78 leading-relaxed animate-fade-up" style={{ animationDelay: '180ms' }}>
                {t('report.subtitle')}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm animate-cta-pop" style={{ animationDelay: '260ms' }}>
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">{t('report:narrative.reading_label')}</p>
              <p className="mt-2 text-3xl font-black tabular-nums">{Math.round(scrollProgress)}%</p>
              <p className="mt-1 text-sm text-white/70">{t('report:narrative.reading_hint')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  color="primary"
                  icon={copied ? CheckCircle : Link}
                  onClick={copyLink}
                  className="!border-white/40 !bg-white/10 !text-white hover:!bg-white/20"
                >
                  {copied ? 'Copié !' : t('report.copy_link')}
                </Button>
                <Button
                  variant="filled"
                  size="sm"
                  color="primary"
                  icon={Download}
                  type="button"
                  onClick={exportPdf}
                  className="!bg-white !text-primary hover:!bg-white/90"
                >
                  {t('report.download_pdf')}
                </Button>
              </div>
            </div>
          </div>
        </header>

      {/* Mobile TOC toggle */}
      <button
        onClick={() => setTocOpen(!tocOpen)}
        className="flex desktop:hidden items-center gap-2 px-4 py-2 mb-4 rounded-md border border-border text-body-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors w-full focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2"
        aria-expanded={tocOpen}
      >
        <List size={18} />
        <span>{t('report.toc')}</span>
        <ChevronRight
          size={16}
          className={`ml-auto transition-transform ${tocOpen ? 'rotate-90' : ''}`}
        />
      </button>

      <div className="flex gap-8">
        {/* Desktop TOC */}
        <aside className="hidden desktop:block w-64 shrink-0">
          <div className="sticky top-24 space-y-1">
            <h2 className="text-label text-text-secondary mb-3 px-3">
              {t('report.toc')}
            </h2>
            {tocItems.map((item) => renderTocItem(item))}
          </div>
        </aside>

        {/* Mobile TOC overlay */}
        {tocOpen && (
          <div className="desktop:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setTocOpen(false)}>
            <div
              className="absolute left-0 top-16 bottom-0 w-72 bg-white shadow-lg overflow-y-auto p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-label text-text-secondary mb-3">
                {t('report.toc')}
              </h2>
              {tocItems.map((item) => renderTocItem(item))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 max-w-3xl space-y-10">
          <section id="approach">
            <h2 className="text-h3 font-bold text-text mb-4 flex items-center gap-2">
              <BookOpen size={22} className="text-primary" />
              {t('report.sections.approach')}
            </h2>
            <p className="text-body text-text-secondary leading-relaxed">
              {t('report:content.approach')}
            </p>
          </section>

          <section id="sources">
            <h2 className="text-h3 font-bold text-text mb-4 flex items-center gap-2">
              <Database size={22} className="text-secondary" />
              {t('report.sections.sources')}
            </h2>
            <p className="text-body text-text-secondary leading-relaxed">
              {t('report:content.sources')}
            </p>
          </section>

          <section id="quality">
            <h2 className="text-h3 font-bold text-text mb-4 flex items-center gap-2">
              <BarChart3 size={22} className="text-info" />
              {t('report.sections.quality')}
            </h2>

            <div id="completeness" className="mb-6">
              <h3 className="text-h4 font-semibold text-text mb-3">
                {t('report.sections.completeness')}
              </h3>
              <p className="text-body text-text-secondary leading-relaxed">
                {t('report:content.quality_completeness')}
              </p>
              {/* Quality table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-body-sm border-collapse">
                  <thead>
                    <tr className="bg-primary-light text-primary">
                      <th className="text-left px-4 py-2 font-semibold">{t('report:quality_table.dimension')}</th>
                      <th className="text-left px-4 py-2 font-semibold">{t('report:quality_table.completeness')}</th>
                      <th className="text-left px-4 py-2 font-semibold">{t('report:quality_table.precision')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-surface-alt">
                      <td className="px-4 py-2">{t('report:quality_table.rows.density')}</td>
                      <td className="px-4 py-2">
                        <Badge variant="success" size="sm">100%</Badge>
                      </td>
                      <td className="px-4 py-2">{t('report:quality_table.precision_values.density')}</td>
                    </tr>
                    <tr className="hover:bg-surface-alt">
                      <td className="px-4 py-2">{t('report:quality_table.rows.zaap')}</td>
                      <td className="px-4 py-2">
                        <Badge variant="success" size="sm">100%</Badge>
                      </td>
                      <td className="px-4 py-2">{t('report:quality_table.precision_values.zaap')}</td>
                    </tr>
                    <tr className="hover:bg-surface-alt">
                      <td className="px-4 py-2">{t('report:quality_table.rows.access')}</td>
                      <td className="px-4 py-2">
                        <Badge variant="warning" size="sm">85%</Badge>
                      </td>
                      <td className="px-4 py-2">{t('report:quality_table.precision_values.access')}</td>
                    </tr>
                    <tr className="hover:bg-surface-alt">
                      <td className="px-4 py-2">{t('report:quality_table.rows.coop')}</td>
                      <td className="px-4 py-2">
                        <Badge variant="warning" size="sm">85%</Badge>
                      </td>
                      <td className="px-4 py-2">{t('report:quality_table.precision_values.coop')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div id="precision">
              <h3 className="text-h4 font-semibold text-text mb-3">
                {t('report.sections.precision')}
              </h3>
              <p className="text-body text-text-secondary leading-relaxed">
                {t('report:content.quality_precision')}
              </p>
            </div>
          </section>

          <section id="analyses">
            <h2 className="text-h3 font-bold text-text mb-4 flex items-center gap-2">
              <Target size={22} className="text-accent" />
              {t('report.sections.analyses')}
            </h2>
            <p className="text-body text-text-secondary leading-relaxed">
              {t('report:content.analyses')}
            </p>
          </section>

          <section id="comparative">
            <h2 className="text-h3 font-bold text-text mb-4 flex items-center gap-2">
              <BarChart3 size={22} className="text-accent" />
              {t('report.sections.comparative')}
            </h2>
            <p className="text-body text-text-secondary leading-relaxed mb-4">
              {t('report:content.comparative_intro')}
            </p>

            <div className="mb-6 rounded-md border border-warning/30 bg-warning/10 p-4">
              <p className="text-body-sm font-semibold text-text">
                {t('report:content.score_explainer')}
              </p>
              <p className="text-body-xs text-text-secondary mt-1">
                {t('report:content.comparative_note')}
              </p>
            </div>

            <div className="mb-6 rounded-md border border-border bg-white p-4">
              <h3 className="text-h4 font-semibold text-text mb-2">
                {t('report:content.weighting_title')}
              </h3>
              <p className="text-body-sm text-text-secondary mb-4">
                {t('report:content.weighting_intro')}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm border-collapse">
                  <thead>
                    <tr className="bg-primary-light text-primary">
                      <th className="text-left px-4 py-2 font-semibold">{t('report:weighting_table.criterion')}</th>
                      <th className="text-left px-4 py-2 font-semibold">{t('report:weighting_table.weight')}</th>
                      <th className="text-left px-4 py-2 font-semibold">{t('report:weighting_table.why')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(['density', 'access', 'coop', 'zaap'] as const).map((key) => (
                      <tr key={key} className="hover:bg-surface-alt">
                        <td className="px-4 py-2">{t(`report:weighting_table.rows.${key}.criterion`)}</td>
                        <td className="px-4 py-2 font-semibold text-primary">{t(`report:weighting_table.rows.${key}.weight`)}</td>
                        <td className="px-4 py-2 text-text-secondary">{t(`report:weighting_table.rows.${key}.why`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 rounded-md border-l-4 border-primary bg-primary-light/30 p-4">
              <h3 className="text-body font-semibold text-text mb-1">
                {t('report:content.top_priorities_title')}
              </h3>
              <p className="text-body-sm text-text-secondary">
                {t('report:content.top_priorities_text')}
              </p>
            </div>

            {synthLoading ? (
              <div className="flex items-center justify-center py-12 text-text-secondary">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
                <span>{t('report:table.no_data')}</span>
              </div>
            ) : (
              <>
                {/* Radar + Selector row */}
                <div className="flex flex-col tablet:flex-row gap-6 mb-8 p-4 rounded-md bg-surface-alt/50 border border-border">
                  {/* Radar */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    {currentPref && (
                      <RadarChart prefecture={currentPref} regionAverages={regionAvg} />
                    )}
                  </div>

                  {/* Info panel */}
                  <div className="flex-1 min-w-0">
                    {/* Prefecture selector */}
                    <label className="text-label text-text-secondary mb-1.5 block">
                      {t('report:radar.select')}
                    </label>
                    <select
                      value={selectedPrefecture ?? ''}
                      onChange={(e) => setSelectedPrefecture(e.target.value)}
                      className="w-full max-w-xs mb-4 px-3 py-2 rounded-md border border-border text-body-sm bg-white
                        focus:outline-2 focus:outline-primary focus:outline-offset-1"
                    >
                      {prefectures.map((p) => (
                        <option key={p.nom_prefecture} value={p.nom_prefecture}>
                          {p.nom_prefecture} — {p.region}
                        </option>
                      ))}
                    </select>

                    {currentPref && (
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { label: t('report:table.synthesis'), value: currentPref.synthesis_score, color: '#D7191C' },
                          { label: t('report:table.density'), value: currentPref.density_score, color: '#D95F0E' },
                          { label: t('report:table.access'), value: currentPref.accessibility_score, color: '#756BB1' },
                          { label: t('report:table.coop'), value: currentPref.coop_score, color: '#FC8D59' },
                          { label: t('report:table.zaap'), value: currentPref.zaap_score, color: '#1B7837' },
                        ] as const).map(({ label, value, color }) => (
                          <div
                            key={label}
                            className="flex flex-col p-2.5 rounded-sm border border-border bg-white"
                          >
                            <span className="text-body-xs text-text-secondary">{label}</span>
                            <span
                              className="text-h3 font-bold mt-0.5"
                              style={{ color }}
                            >
                              {Math.round(value)}
                              <span className="text-body-xs text-text-secondary font-normal ml-0.5">/100</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ranking table */}
                <h3 className="text-h4 font-semibold text-text mb-3">
                  {t('report:table.title')}
                </h3>
                <RankingTable
                  prefectures={prefectures}
                  selectedPrefecture={selectedPrefecture}
                  onSelectPrefecture={setSelectedPrefecture}
                />
              </>
            )}
          </section>

          <section id="limits">
            <h2 className="text-h3 font-bold text-text mb-4 flex items-center gap-2">
              <AlertTriangle size={22} className="text-warning" />
              {t('report.sections.limits')}
            </h2>
            <p className="text-body text-text-secondary leading-relaxed">
              {t('report:content.limits')}
            </p>
          </section>

          <section id="conclusion">
            <h2 className="text-h3 font-bold text-text mb-4 flex items-center gap-2">
              <CheckCircle size={22} className="text-success" />
              {t('report.sections.conclusion')}
            </h2>
            <p className="text-body text-text-secondary leading-relaxed">
              {t('report:content.conclusion')}
            </p>
          </section>

          {/* Freshness */}
          <div className="flex justify-center pt-4">
            <Badge variant="info" size="md">
              {t('badge.data_freshness')}
            </Badge>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
