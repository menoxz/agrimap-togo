import { useState, useEffect } from 'react';
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
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

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
    { id: 'limits', label: t('report.sections.limits'), icon: AlertTriangle },
    { id: 'conclusion', label: t('report.sections.conclusion'), icon: CheckCircle },
  ];

  useEffect(() => {
    const flattenIds = (items: TocItem[]): string[] => {
      return items.flatMap((item) => [item.id, ...(item.children ? flattenIds(item.children) : [])]);
    };

    const sectionIds = flattenIds(tocItems);

    const observer = new IntersectionObserver(
      (entries) => {
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
    <div className="container-page py-6 tablet:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h2 font-bold text-text">{t('report.title')}</h1>
          <p className="text-body text-text-secondary mt-1">
            {t('report.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            color="primary"
            icon={copied ? CheckCircle : Link}
            onClick={copyLink}
          >
            {copied ? 'Copié !' : t('report.copy_link')}
          </Button>
          <Button
            variant="filled"
            size="md"
            color="primary"
            icon={Download}
          >
            {t('report.download_pdf')}
          </Button>
        </div>
      </div>

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
  );
}
