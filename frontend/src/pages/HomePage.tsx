import { Link } from 'react-router-dom';
import { Sprout, ArrowRight, Map as MapIcon, BookOpen, FileText, AlertTriangle, Compass, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { TogoMap } from '@/components/map';
import DataLayer from '@/components/map/DataLayer';
import { TogoAccentBorder } from '@/components/ui/TogoAccentBorder';
import { TogoPatternDivider } from '@/components/ui/TogoPatternDivider';

export default function HomePage() {
  const { t } = useTranslation();
  const { ref: whyRef } = useScrollReveal();

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 overflow-hidden"
        style={{
          backgroundImage: 'url(/images/hero-agriculture.jpg)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
      >

        {/* PROB-1: Overlay directionnel sombre — lisibilité texte blanc WCAG AA */}
        <div
          className="absolute inset-0 z-[1]"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.50) 60%, rgba(0,0,0,0.65) 100%)',
          }}
        />

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
              className="inline-flex items-center justify-center gap-3 font-semibold rounded-md text-body-lg px-6 py-3 tablet:px-8 tablet:py-4 desktop:px-8 desktop:py-4 bg-white/15 backdrop-blur-sm border border-white/30 text-white hover:bg-white/25 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 cta-hover-scale"
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
          <span className="text-white/50 text-[10px] uppercase tracking-widest">
            {t('home.hero.scroll')}
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

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
          {[
            { value: '22', label: t('home.stats.kpi1_label'), desc: t('home.stats.kpi1_desc'), color: '#006A4E' },
            { value: '5',  label: t('home.stats.kpi2_label'), desc: t('home.stats.kpi2_desc'), color: '#FFD100' },
            { value: '37%',label: t('home.stats.kpi3_label'), desc: t('home.stats.kpi3_desc'), color: '#D21034' },
          ].map((kpi) => (
            <div key={kpi.value} className="flex flex-col items-center py-5">
              {/* Valeur outline */}
              <span className="text-7xl font-black leading-none"
                    style={{ color: 'transparent', WebkitTextStroke: `2px ${kpi.color}` }}>
                {kpi.value}
              </span>
              {/* Titre */}
              <span className="text-sm font-bold uppercase tracking-widest text-text mt-3">
                {kpi.label}
              </span>
              {/* Description */}
              <span className="text-sm text-secondary mt-1">{kpi.desc}</span>
            </div>
          ))}
        </div>

        {/* Bloc criticité par région */}
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-text">{t('home.stats.region_title')}</h3>
            <p className="text-sm text-togo-green italic mt-1">{t('home.stats.region_subtitle')}</p>
          </div>

          <div className="flex flex-row justify-between flex-wrap">
            {[
              { name: t('home.stats.regions.maritime'),  pct: 85, color: '#D21034' },
              { name: t('home.stats.regions.savanes'),   pct: 78, color: '#D21034' },
              { name: t('home.stats.regions.kara'),      pct: 72, color: '#FFD100' },
              { name: t('home.stats.regions.centrale'),  pct: 61, color: '#FFD100' },
              { name: t('home.stats.regions.plateaux'),  pct: 54, color: '#006A4E' },
            ].map((r) => {
              const R = 36, C = 2 * Math.PI * R;
              const filled = (r.pct / 100) * C;
              return (
                <div key={r.name} className="flex flex-col items-center gap-3">
                  {/* Cercle SVG */}
                  <svg width="96" height="96" viewBox="0 0 96 96">
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
                    {r.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      <TogoPatternDivider color="green" />

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
                    { c: '#D21034', l: t('home.minimap.legend_critical') },
                    { c: '#FFD100', l: t('home.minimap.legend_moderate') },
                    { c: '#006A4E', l: t('home.minimap.legend_low') },
                  ] as { c: string; l: string }[]
                ).map(({ c, l }) => (
                  <div key={l} className="flex items-center gap-3">
                    <span className="inline-block w-5 h-5 rounded-full shrink-0"
                          style={{ border: `2.5px solid ${c}`, backgroundColor: 'transparent' }} />
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

          {/* Cards stagger — décalage mt-0 / mt-10 / mt-20 */}
          <div className="grid grid-cols-1 tablet:grid-cols-3 desktop:grid-cols-3 gap-6 tablet:items-start desktop:items-start">

            {/* Card 01 — Problème */}
            <div className="scroll-reveal-scale" style={{ transitionDelay: '0ms' }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                {/* Ligne accent rouge */}
                <div className="h-[3px] w-full bg-togo-red" aria-hidden="true" />
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
            <div className="tablet:mt-10 desktop:mt-10 scroll-reveal-scale" style={{ transitionDelay: '130ms' }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                {/* Ligne accent vert */}
                <div className="h-[3px] w-full bg-togo-green" aria-hidden="true" />
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
            <div className="tablet:mt-20 desktop:mt-20 scroll-reveal-scale" style={{ transitionDelay: '260ms' }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                {/* Ligne accent ambre */}
                <div className="h-[3px] w-full bg-amber-700" aria-hidden="true" />
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
        <Badge variant="info" size="md">
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
