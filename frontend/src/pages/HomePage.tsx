import { Link } from 'react-router-dom';
import { Sprout, ArrowRight, Map as MapIcon, BookOpen, FileText, AlertTriangle, Compass, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useMemo } from 'react';
import type { GeoJsonFeatureCollection } from '@/types/map';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { TogoMap } from '@/components/map';
import DataLayer from '@/components/map/DataLayer';
import { TogoAccentBorder } from '@/components/ui/TogoAccentBorder';
import { TogoPatternDivider } from '@/components/ui/TogoPatternDivider';

const DATA_URL = '/data/analysis/prefecture_synthesis.geojson';

// nombre de types de services dans le modèle de données
// (n_marches, n_cooperatives, n_exploitations, n_zaap, n_pepinieres)
const SERVICE_TYPES = 5;

function computeStats(data: GeoJsonFeatureCollection | null) {
  if (!data || !data.features) return null;
  const features = data.features.map(f => f.properties as Record<string, unknown>);

  const total = features.length;

  // White zone stats
  const whiteMajority = features.filter(f => Number(f.white_zone_pct ?? 0) > 50).length;
  const nationalAvg = features.reduce((a, f) => a + Number(f.white_zone_pct ?? 0), 0) / total;

  // Regional averages
  const regionMap: Record<string, { sum: number; count: number }> = {};
  features.forEach(f => {
    const r = String(f.region ?? '');
    const wp = Number(f.white_zone_pct ?? 0);
    if (!regionMap[r]) regionMap[r] = { sum: 0, count: 0 };
    regionMap[r].sum += wp;
    regionMap[r].count += 1;
  });

  const regionKeys: Record<string, string> = {
    Maritime: 'home.stats.regions.maritime',
    Savanes: 'home.stats.regions.savanes',
    Kara: 'home.stats.regions.kara',
    Centrale: 'home.stats.regions.centrale',
    Plateaux: 'home.stats.regions.plateaux',
  };
  const regionOrder = ['Maritime', 'Savanes', 'Kara', 'Centrale', 'Plateaux'];

  const regions = regionOrder
    .filter(r => regionMap[r])
    .map(r => ({
      name: r,
      pct: Math.round(regionMap[r].sum / regionMap[r].count),
      color: regionMap[r].sum / regionMap[r].count > 75 ? '#D21034'
        : regionMap[r].sum / regionMap[r].count > 60 ? '#FFD100'
        : '#006A4E',
    }));

  return {
    kpi1: whiteMajority,
    kpi2: SERVICE_TYPES,
    kpi3: Math.round(nationalAvg),
    total,
    regions,
  };
}

export default function HomePage() {
  const { t } = useTranslation();
  const { ref: whyRef } = useScrollReveal();
  const { data: synthData, loading } = useDataLoader(DATA_URL);
  const stats = useMemo(() => computeStats(synthData), [synthData]);

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #003D24 0%, #006A4E 35%, #0D2B3E 70%, #0A1628 100%)',
        }}
      >

        {/* Contenu centré */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto gap-6">
          <div className="text-togo-yellow mb-2" aria-hidden="true">
            <Sprout size={64} strokeWidth={1.5} />
          </div>

          <h1 className="text-hero mobile:text-h1 font-extrabold text-white text-balance leading-tight">
            {t('home.hero.headline')}
          </h1>

          <TogoAccentBorder width="short" className="mx-auto mt-3" />

          <p className="text-body-lg text-white/80 max-w-xl text-balance">
            {t('home.hero.subtitle')}
          </p>

          <div className="flex flex-row flex-wrap gap-4 mt-8">
            {/* CTA Primaire — Vert Togo, renforcé padding + shadow */}
            <Link to="/explore">
              <Button
                variant="filled"
                size="lg"
                color="primary"
                icon={MapIcon}
                className="!px-8 !py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                {t('home.hero.cta_explore')}
              </Button>
            </Link>

            {/* CTA Secondaire — Glassmorphism sur fond sombre */}
            <Link
              to="/story"
              className="inline-flex items-center justify-center gap-3 font-semibold rounded-md text-body-lg px-6 py-3 tablet:px-8 tablet:py-4 desktop:px-8 desktop:py-4 bg-transparent border-2 border-white text-white hover:bg-white/10 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 cta-hover-scale"
            >
              <BookOpen size={24} className="shrink-0" />
              <span>{t('home.hero.cta_story')}</span>
            </Link>
          </div>

          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-white/70 hover:text-white transition-colors mt-2 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 rounded px-2 py-1 cta-hover-scale"
          >
            <FileText size={16} />
            {t('home.hero.cta_report')}
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <span className="text-white/50 text-[10px] uppercase tracking-widest drop-shadow-lg">
            {t('home.hero.scroll')}
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* Séparateur tricolore Togo Heritage */}
      <div className="flex w-full" aria-hidden="true">
        <div className="h-2 flex-1 bg-[#D21034]" />
        <div className="h-2 flex-1 bg-[#FFD100]" />
        <div className="h-2 flex-1 bg-[#006A4E]" />
      </div>

      {/* Stats Section — KPI + Cercles SVG */}
      <section aria-labelledby="stats-title" className="container-page py-16 text-center">

        {/* En-tête de section */}
        <div className="mb-10">
          <h2 id="stats-title" className="text-5xl font-black tracking-tight text-text">
            {t('home.stats.title')}
          </h2>
          <p className="mt-2 text-base text-togo-green italic font-medium">
            {t('home.stats.subtitle')}
          </p>
        </div>

        {/* Ligne KPI — 3 métriques côte à côte */}
         <div className="flex flex-row justify-between gap-8 mb-16">
          {(
          [
            { value: stats ? `${stats.kpi1}` : '—', label: t('home.stats.kpi1_label'), desc: t('stats.kpi1.sub', { total: stats?.total ?? '—' }), colorClass: 'text-red-600', tooltip: t('stats.kpi1.tooltip') },
            { value: stats ? `${stats.kpi2}` : '—',  label: t('home.stats.kpi2_label'), desc: t('home.stats.kpi2_desc'), colorClass: 'text-green-700', tooltip: '' },
            { value: stats ? `${stats.kpi3}%` : '—', label: t('home.stats.kpi3_label'), desc: t('stats.kpi3.desc'), colorClass: 'text-red-600', tooltip: '' },
          ] as { value: string; label: string; desc: string; colorClass: string; tooltip: string }[]
          ).map((kpi) => (
            <div key={kpi.label} className="flex flex-col items-center py-5">
              {/* Valeur outline */}
              <span className={`text-7xl font-black leading-none ${kpi.colorClass}`}
                    title={kpi.tooltip || undefined}>
                {kpi.value}
              </span>
              {/* Titre */}
              <span className="text-sm font-bold uppercase tracking-widest text-text mt-3">
                {kpi.label}
              </span>
              {/* Description */}
              <span className="text-sm text-stone-500 mt-1">{kpi.desc}</span>
            </div>
          ))}
        </div>

        {/* Bloc criticité par région */}
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-text">{t('home.stats.region_title')}</h3>
            <p className="text-sm text-togo-green italic mt-1">{t('stats.regions.subtitle')}</p>
          </div>

          {loading && (
            <div className="text-center text-sm text-secondary italic py-4">
              {t('home.stats.loading')}
            </div>
          )}
          <div className="flex flex-row justify-between flex-wrap">

            {(function () {
              // Build region display data: use real stats or fallback placeholders
              const regionItems = stats?.regions?.length
                ? stats.regions.map((r) => ({
                    ...r,
                    displayName: t(`home.stats.regions.${r.name.toLowerCase()}` as any),
                  }))
                : [
                    { name: 'Maritime', pct: 0, color: '#D21034', displayName: t('home.stats.regions.maritime') },
                    { name: 'Savanes',  pct: 0, color: '#D21034', displayName: t('home.stats.regions.savanes') },
                    { name: 'Kara',     pct: 0, color: '#FFD100', displayName: t('home.stats.regions.kara') },
                    { name: 'Centrale', pct: 0, color: '#FFD100', displayName: t('home.stats.regions.centrale') },
                    { name: 'Plateaux', pct: 0, color: '#006A4E', displayName: t('home.stats.regions.plateaux') },
                  ];
              return regionItems.map((r) => {
              const R = 36, C = 2 * Math.PI * R;
              const filled = (r.pct / 100) * C;
              return (
                <div key={r.name} className="flex flex-col items-center gap-3">
                  {/* Cercle SVG */}
                  <svg width="96" height="96" viewBox="0 0 96 96" style={{ background: 'transparent' }}>
                    {/* Piste grise */}
                    <circle cx="48" cy="48" r={R} fill="none"
                            stroke="#E5E7EB" strokeWidth="8" />
                    {/* Arc coloré */}
                    <circle cx="48" cy="48" r={R} fill="none"
                            stroke={r.color} strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${filled} ${C}`}
                            transform="rotate(-90 48 48)" />
                    {/* Valeur centrale */}
                    <text x="48" y="53" textAnchor="middle"
                          fontSize="16" fontWeight="800" fill="#374151"
                          fontFamily="Sora, sans-serif">
                      {r.pct}%
                    </text>
                  </svg>
                  {/* Nom de région */}
                  <span className="text-xs font-semibold text-center text-text uppercase tracking-wide">
                    {r.displayName}
                  </span>
                </div>
              );
            });
          })()}
          </div>
        </div>

      </section>

      <div aria-hidden="true" className="h-8 w-full" />

      {/* Mini Map Section — Split Horizontal */}
      <section className="overflow-hidden py-12 tablet:py-0 desktop:py-0">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
          <div className="flex flex-col tablet:flex-row desktop:flex-row tablet:min-h-[480px] desktop:min-h-[480px]">

            {/* Gauche texte */}
            <div className="tablet:w-2/5 desktop:w-2/5 flex flex-col justify-start py-12 tablet:pr-10 desktop:pr-10 space-y-6 scroll-reveal-left">
              <h2 className="text-5xl font-black tracking-tight text-text leading-tight">
                {t('home.minimap.title')}
              </h2>
              <p className="text-togo-green italic text-sm font-medium">{t('home.minimap.desc')}</p>
              <div className="flex flex-col gap-3">
                {(
                  [
                    { bg: 'bg-red-500',   l: t('home.minimap.legend_critical') },
                    { bg: 'bg-amber-400', l: t('home.minimap.legend_moderate') },
                    { bg: 'bg-green-500', l: t('home.minimap.legend_low') },
                  ] as { bg: string; l: string }[]
                ).map(({ bg, l }) => (
                  <div key={l} className="flex items-center gap-3">
                    <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${bg}`} />
                    <span className="text-sm font-medium text-text">{l}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-10">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-togo-green text-white font-semibold text-sm rounded-md shadow-md hover:bg-togo-green-dark hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                  </svg>
                  {t('home.minimap.cta')}
                </Link>
              </div>
            </div>

            {/* Droite carte — composant TogoMap existant */}
            <div className="tablet:w-3/5 desktop:w-3/5 h-72 tablet:h-auto desktop:h-auto rounded-2xl overflow-hidden relative scroll-reveal-right">
              <TogoMap zoom={7} scrollWheelZoom={false}>
                <DataLayer
                  url="/data/regions.geojson"
                  layerId="home-regions"
                  style={() => ({
                    fillColor: '#E8F5E9',
                    weight: 1.5,
                    opacity: 0.8,
                    color: '#1B5E20',
                    fillOpacity: 0.4,
                  })}
                  onEachFeature={(feature, layer) => {
                    const name =
                      (feature.properties.nom_region as string) ||
                      (feature.properties.region as string) ||
                      '';
                    if (name) {
                      layer.bindTooltip(name, {
                        permanent: false,
                        direction: 'center',
                        className: 'region-tooltip',
                      });
                      layer.on('click', () => {
                        layer
                          .bindPopup(
                            `<b>${name}</b><br/>Capitale: ${feature.properties.capitale || '—'}<br/>Population: ${feature.properties.population ? Number(feature.properties.population).toLocaleString() : '—'}`,
                          )
                          .openPopup();
                      });
                    }
                  }}
                  attribution="Régions du Togo"
                />
              </TogoMap>
              <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-xl shadow px-3 py-1.5 text-xs font-medium text-text flex items-center gap-1.5 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-togo-green animate-pulse-dot" />
                {t('home.minimap.interactive')}
              </div>
            </div>

          </div>
        </div>
      </section>

      <TogoPatternDivider color="yellow" />

      {/* Bannière photographique agricole — entre Mini-Map et Why */}
      <div className="relative h-48 tablet:h-56 overflow-hidden"
           style={{
             backgroundImage: 'url(/images/banner-farming.jpg)',
             backgroundAttachment: 'fixed',
             backgroundSize: 'cover',
             backgroundPosition: 'center center',
           }}>
        {/* Overlay noir transparent */}
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
        {/* Citation / statistique centrée */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white text-body-lg tablet:text-h3 font-semibold text-center px-6 max-w-2xl drop-shadow-lg">
            {t('home.photo_banner.quote')}
          </p>
        </div>
      </div>

      {/* Why section — "Cartes Claires Pro" */}
      <section
        ref={whyRef}
        className="py-20 bg-bg"
        aria-labelledby="why-title"
      >
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">

          {/* En-tête de section */}
          <div className="mb-14 max-w-xl scroll-reveal">
            <span className="text-togo-green text-xs uppercase tracking-[0.2em] font-semibold">
              {t('home.why.eyebrow')}
            </span>
            <h2 id="why-title" className="text-5xl font-black tracking-tight text-text mt-2 leading-tight">
              {t('home.why.title')}
            </h2>
          </div>

          {/* Cards — même hauteur top, pas de stagger */}
          <div className="grid grid-cols-1 tablet:grid-cols-3 desktop:grid-cols-3 gap-6 tablet:items-start desktop:items-start">

            {/* Card 01 — Problème */}
            <div className="scroll-reveal-scale" style={{ transitionDelay: '0ms' }}>
              <div className="bg-white rounded-2xl border border-gray-100 border-t-4 border-t-red-500 shadow-sm flex flex-col overflow-hidden h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <div className="p-7 flex flex-col gap-4 flex-1">
                  {/* Pastille icône */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-togo-red/10">
                    <AlertTriangle className="w-5 h-5 text-togo-red" strokeWidth={1.75} />
                  </div>
                  {/* Badge numéroté */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-togo-red w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-togo-red" aria-hidden="true" />
                    {t('home.why.problem.step')}
                  </span>
                  <h3 className="text-lg font-bold text-text leading-snug">
                    {t('home.why.problem.title')}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed flex-1">
                    {t('home.why.problem.text')}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 02 — Solution */}
            <div className="scroll-reveal-scale" style={{ transitionDelay: '130ms' }}>
              <div className="bg-white rounded-2xl border border-gray-100 border-t-4 border-t-green-700 shadow-sm flex flex-col overflow-hidden h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <div className="p-7 flex flex-col gap-4 flex-1">
                  {/* Pastille icône */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-togo-green/10">
                    <Compass className="w-5 h-5 text-togo-green" strokeWidth={1.75} />
                  </div>
                  {/* Badge numéroté */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-togo-green w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-togo-green" aria-hidden="true" />
                    {t('home.why.solution.step')}
                  </span>
                  <h3 className="text-lg font-bold text-text leading-snug">
                    {t('home.why.solution.title')}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed flex-1">
                    {t('home.why.solution.text')}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 03 — Impact */}
            <div className="scroll-reveal-scale" style={{ transitionDelay: '260ms' }}>
              <div className="bg-white rounded-2xl border border-gray-100 border-t-4 border-t-amber-500 shadow-sm flex flex-col overflow-hidden h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <div className="p-7 flex flex-col gap-4 flex-1">
                  {/* Pastille icône */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-700/10">
                    <TrendingUp className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
                  </div>
                  {/* Badge numéroté */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-700" aria-hidden="true" />
                    {t('home.why.impact.step')}
                  </span>
                  <h3 className="text-lg font-bold text-text leading-snug">
                    {t('home.why.impact.title')}
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed flex-1">
                    {t('home.why.impact.text')}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Freshness badge */}
      <div className="container-page pb-8 flex justify-center">
        <Badge variant="default" size="md" className="!bg-stone-100 !text-stone-600 border !border-stone-200">
          {t('badge.data_freshness')}
        </Badge>
      </div>

      {/* Footer accent — barre tricolore pleine largeur */}
      <div className="container-page pb-4">
        <TogoAccentBorder width="full" />
      </div>
    </div>
  );
}
