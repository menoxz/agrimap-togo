import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layers, Filter, ListOrdered, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useMapFilters } from '@/hooks/useMapFilters';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useMap } from 'react-leaflet';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import {
  TogoMap,
  DensityLayer,
  ZAAPLayer,
  AccessibilityLayer,
  CoopLayer,
  SynthesisLayer,
  FilterPanel,
  MapLegend,
  MapController,
} from '@/components/map';
import PrefectureDetailPanel, { type PrefectureDetailData } from '@/components/map/PrefectureDetailPanel';
import TopZonesList from '@/components/map/TopZonesList';
import type { AnalysisType, GeoJsonFeature } from '@/types/map';

const DATA_URL = '/data/synthesis.geojson';

const REGION_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  Maritime: [[6.10, 0.57],  [7.10, 1.80]],
  Plateaux: [[6.55, 0.57],  [8.30, 1.75]],
  Centrale: [[8.10, 0.50],  [9.55, 1.65]],
  Kara:     [[9.35, 0.45],  [10.65, 1.60]],
  Savanes:  [[10.40, 0.10], [11.14, 1.70]],
};

function FlyToRegion({ region }: { region: string }) {
  const map = useMap();
  useEffect(() => {
    if (region) {
      const bounds = REGION_BOUNDS[region];
      if (bounds) map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 });
    } else {
      map.flyTo([8.5, 1.0], 7, { animate: true, duration: 1.2 });
    }
  }, [region, map]);
  return null;
}

function FlyToZone({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 9, { animate: true, duration: 1.0 });
  }, [coords, map]);
  return null;
}

function computeCentroid(geometry: GeoJsonFeature['geometry']): [number, number] | null {
  function averageRing(ring: number[][]): [number, number] {
    let sumLat = 0, sumLng = 0;
    for (const coord of ring) { sumLat += coord[1]; sumLng += coord[0]; }
    return [sumLat / ring.length, sumLng / ring.length];
  }
  if (geometry.type === 'Polygon') {
    const ring = (geometry.coordinates as number[][][])[0];
    return ring?.length ? averageRing(ring) : null;
  }
  if (geometry.type === 'MultiPolygon') {
    let sumLat = 0, sumLng = 0, count = 0;
    for (const polygon of geometry.coordinates as number[][][][]) {
      for (const coord of polygon[0] ?? []) { sumLat += coord[1]; sumLng += coord[0]; count++; }
    }
    return count > 0 ? [sumLat / count, sumLng / count] : null;
  }
  return null;
}

export default function ExplorePage() {
  const { t, currentLang } = useTranslation();
  const [legendOpen, setLegendOpen] = useState(true);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visibleMarkers, setVisibleMarkers] = useState<Set<string>>(new Set());

  const [prefectureFeatures, setPrefectureFeatures] = useState<GeoJsonFeature[]>([]);
  const [selectedPrefectureData, setSelectedPrefectureData] = useState<PrefectureDetailData | null>(null);

  const handleMarkerToggle = useCallback((type: string) => {
    setVisibleMarkers((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const { filters, setSelectedRegion, setSelectedPrefecture, setActiveLayer, setZaapOnlyUncovered, resetFilters, isFiltered } = useMapFilters();
  const activeLayer: AnalysisType = filters.activeLayers[0] || 'density';
  const regionFilterValue = filters.selectedRegion
    ? filters.selectedRegion.charAt(0).toUpperCase() + filters.selectedRegion.slice(1)
    : '';

  const [showPrefectures, setShowPrefectures] = useState(false);

  /**
   * The prefecture layer is automatically activated when a prefecture is
   * selected so the ADM2 polygon highlight is visible even if the user
   * hasn't manually toggled the layer on.
   */
  const effectiveShowPrefectures = showPrefectures || filters.selectedPrefecture !== '';

  const { data: synthesisData } = useDataLoader(DATA_URL);
  const allZones = useMemo(() => {
    if (!synthesisData?.features) return [];
    return [...synthesisData.features].sort(
      (a, b) => ((a.properties.rang as number) ?? 999) - ((b.properties.rang as number) ?? 999),
    );
  }, [synthesisData]);

  /**
   * Handle click on a prefecture from any analysis layer.
   * Finds the matching feature geometry, opens the PrefectureDetailPanel,
   * and flies the map to the prefecture centroid.
   */
  const handlePrefectureClick = useCallback((nomPrefecture: string, properties: Record<string, any>) => {
    if (!nomPrefecture) return;

    // Find feature in prefectureFeatures to get geometry
    const feature = prefectureFeatures.find(
      f => f.properties?.nom_prefecture === nomPrefecture,
    );
    if (!feature) return;

    // Open the detail panel with the RICH feature properties (not the analysis-layer subset)
    setSelectedPrefectureData(feature.properties as unknown as PrefectureDetailData);

    // Fly-to if geometry available
    if (feature.geometry) {
      const center = computeCentroid(feature.geometry);
      if (center) setFlyToCoords(center);
    }
  }, [prefectureFeatures]);

  /**
   * Handle click on a zone from TopZonesList — flies to the zone centroid.
   */
  const handleListZoneSelect = useCallback((props: Record<string, string | number | boolean | null | undefined>) => {
    const id = props.id ?? props.rang;
    const feature = allZones.find(
      (f) => f.properties.id === id || f.properties.rang === id,
    );
    if (feature?.geometry) {
      const center = computeCentroid(feature.geometry);
      if (center) setFlyToCoords(center);
    }
  }, [allZones]);

  // Fetch prefecture_synthesis.geojson once on mount
  useEffect(() => {
    fetch('/data/prefecture_synthesis.geojson')
      .then(r => r.json())
      .then(d => setPrefectureFeatures((d.features ?? []) as GeoJsonFeature[]))
      .catch(() => {});
  }, []);

  // Open panel + fly-to when a prefecture is selected via filter
  useEffect(() => {
    if (!filters.selectedPrefecture) {
      setSelectedPrefectureData(null);
      return;
    }
    const feature = prefectureFeatures.find(
      f => f.properties?.nom_prefecture === filters.selectedPrefecture,
    );
    if (!feature?.properties) return;
    setSelectedPrefectureData(feature.properties as unknown as PrefectureDetailData);
    const center = computeCentroid(feature.geometry);
    if (center) setFlyToCoords(center);
  }, [filters.selectedPrefecture, prefectureFeatures]);

  /** Event delegation — intercepts clicks on data-action="open-prefecture-detail"
   *  links emitted by PrefecturePopup (rendered via renderToString, outside React Router).
   *  Uses prefectureFeatures to find the matching feature + centroid.
   */
  useEffect(() => {
    const handleDetailClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-action="open-prefecture-detail"]') as HTMLElement | null;
      if (!link) return;
      e.preventDefault();

      const prefectureName = link.getAttribute('data-prefecture-name');
      if (!prefectureName) return;

      const feature = prefectureFeatures.find(
        (f) => f.properties?.nom_prefecture === prefectureName,
      );
      if (!feature || !feature.geometry) return;

      const center: [number, number] =
        computeCentroid(feature.geometry) ?? [8.6195, 0.8248];

      setSelectedPrefectureData(feature.properties as unknown as PrefectureDetailData);
      setFlyToCoords(center);
    };

    document.addEventListener('click', handleDetailClick);
    return () => document.removeEventListener('click', handleDetailClick);
  }, [prefectureFeatures]);

  /* ── Layer label helper ─────────────────────────────────────────────────── */
  const layerLabel =
    activeLayer === 'density' ? t('map:legend.density')
    : activeLayer === 'zaap'  ? t('map:legend.zaap')
    : activeLayer === 'access'? t('map:legend.access')
    : activeLayer === 'coop'  ? t('map:legend.coop')
    : t('map:legend.synthesis');

  return (
    <>
      {/* ── Hero Explorer ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/hero-agriculture.jpg)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          minHeight: '320px',
        }}
      >
        <div className="absolute inset-0 bg-black/65" aria-hidden="true" />
        <div className="relative z-10 px-6 py-14 flex flex-col items-center text-center gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tight text-white leading-tight">
              {t('explore.hero.title')}
            </h1>
            <p className="text-white/70 italic text-sm font-medium mt-3">
              {t('explore.hero.subtitle')}
            </p>
          </div>
          <div className="flex flex-row items-center gap-12">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black leading-none"
                    style={{ color: 'transparent', WebkitTextStroke: '2px #FFD100' }}>22</span>
              <span className="text-white/65 text-xs mt-1 uppercase tracking-widest">{t('explore.hero.stat_zones')}</span>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black leading-none"
                    style={{ color: 'transparent', WebkitTextStroke: '2px #FFFFFF' }}>5</span>
              <span className="text-white/65 text-xs mt-1 uppercase tracking-widest">{t('explore.hero.stat_regions')}</span>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black leading-none"
                    style={{ color: 'transparent', WebkitTextStroke: '2px #FFD100' }}>4</span>
              <span className="text-white/65 text-xs mt-1 uppercase tracking-widest">{t('explore.hero.stat_services')}</span>
            </div>
          </div>
        </div>
        <div
          className="relative z-10 h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #006A4E 33%, #FFD100 33% 66%, #D21034 66%)' }}
        />
      </section>

      {/* ── Contenu principal — pleine largeur ──────────────────────────── */}
      <div className="w-full pb-6 tablet:pb-8">

        {/* Mobile: bouton toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex desktop:hidden items-center gap-2 mx-4 mb-3 px-4 py-2 bg-togo-green text-white text-sm font-semibold rounded-lg shadow-sm"
          aria-expanded={sidebarOpen}
        >
          <SlidersHorizontal size={16} />
          <span>{t('explore.filters')}</span>
          {sidebarOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {/* ── Layout principal pleine largeur : sidebar gauche + contenu ─── */}
        <div className="flex flex-col desktop:flex-row desktop:items-stretch gap-0 overflow-hidden shadow-sm ring-1 ring-border/20">

          {/* ══ SIDEBAR GAUCHE — même fond que le hero, hauteur complète ══════ */}
          <aside
            className={[
              'relative shrink-0 overflow-hidden',
              'w-full desktop:w-64',
              sidebarOpen ? 'block' : 'hidden',
              'desktop:block',
            ].join(' ')}
            style={{
              backgroundImage: 'url(/images/hero-agriculture.jpg)',
              backgroundAttachment: 'fixed',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
            }}
          >
            {/* Overlay identique au hero + flou backdrop */}
            <div className="absolute inset-0 bg-black/65 backdrop-blur-md" aria-hidden="true" />
            {/* Contenu au-dessus de l'overlay */}
            <div className="relative z-10 flex flex-col h-full">
            {/* Header sidebar */}
            <div className="px-5 pt-5 pb-3 border-b border-white/15">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal size={16} className="text-white/70" />
                <h2 className="text-white font-extrabold text-xs uppercase tracking-widest">
                  {t('explore.filters')}
                </h2>
              </div>
              {isFiltered && (
                <div className="mt-2 flex items-center gap-1.5 text-togo-yellow text-xs font-medium">
                  <Filter size={11} />
                  <span>{t('explore.filtered_by')}: <strong>{regionFilterValue}</strong></span>
                </div>
              )}
            </div>

            {/* Contenu filtres */}
            <div className="p-5">
              <FilterPanel
                dark={true}
                selectedRegion={filters.selectedRegion}
                selectedPrefecture={filters.selectedPrefecture}
                activeLayers={filters.activeLayers}
                zaapOnlyUncovered={filters.zaapOnlyUncovered}
                onRegionChange={setSelectedRegion}
                onPrefectureChange={setSelectedPrefecture}
                onLayerToggle={() => {}}
                onLayerSet={setActiveLayer}
                onZaapOnlyUncoveredChange={setZaapOnlyUncovered}
                onReset={resetFilters}
                isFiltered={isFiltered}
                visibleMarkers={visibleMarkers}
                onMarkerToggle={handleMarkerToggle}
                showPrefectures={effectiveShowPrefectures}
                onPrefecturesToggle={setShowPrefectures}
              />
            </div>

            {/* Pied sidebar : couche active */}
            <div className="px-5 pb-5 mt-auto">
              <div className="pt-4 border-t border-white/15">
                <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
                  {currentLang === 'en' ? 'Active layer' : 'Couche active'}
                </p>
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-togo-yellow shrink-0" />
                  <span className="text-white text-xs font-semibold">{layerLabel}</span>
                </div>
              </div>
            </div>
            </div>{/* fin z-10 wrapper */}
          </aside>

          {/* ══ SECTION PRINCIPALE — titre + carte + top zones ═══════════════ */}
          <div className="flex-1 min-w-0 bg-surface p-5 desktop:p-6">

            {/* Titre + description */}
            <div className="mb-5">
              <h2 className="text-4xl font-black tracking-tight text-text leading-tight">
                {t('explore.title')}
              </h2>
              <p className="text-togo-green italic text-sm font-medium mt-1.5">
                {t('explore.subtitle')}
              </p>
            </div>

            {/* ── Carte + Top zones sur la MÊME LIGNE ───────────────────── */}
            <div className="flex flex-col desktop:flex-row gap-4 items-start">

              {/* CARTE — 55 % de la largeur, hauteur remplit l'écran */}
              <div className="w-full desktop:w-[55%] shrink-0 min-w-0">
                <Card variant="default" padding="none" className="overflow-hidden">
                  <div className="h-[calc(100dvh-180px)] relative">
                    <TogoMap
                      visibleMarkers={visibleMarkers}
                      showPrefectures={effectiveShowPrefectures}
                      prefectureFilter={filters.selectedPrefecture || undefined}
                      selectedPrefecture={filters.selectedPrefecture || undefined}
                    >
                      <DensityLayer
                        visible={activeLayer === 'density'}
                        regionFilter={regionFilterValue || undefined}
                        onPrefectureClick={handlePrefectureClick}
                      />
                      <ZAAPLayer
                        visible={activeLayer === 'zaap'}
                        regionFilter={regionFilterValue || undefined}
                        onlyUncovered={filters.zaapOnlyUncovered}
                        onPrefectureClick={handlePrefectureClick}
                      />
                      <AccessibilityLayer
                        visible={activeLayer === 'access'}
                        regionFilter={regionFilterValue || undefined}
                        onPrefectureClick={handlePrefectureClick}
                      />
                      <CoopLayer
                        visible={activeLayer === 'coop'}
                        regionFilter={regionFilterValue || undefined}
                        onPrefectureClick={handlePrefectureClick}
                      />
                      <SynthesisLayer
                        visible={activeLayer === 'synthesis'}
                        regionFilter={regionFilterValue || undefined}
                        onPrefectureClick={handlePrefectureClick}
                      />
                      <FlyToRegion region={regionFilterValue} />
                      <FlyToZone coords={flyToCoords} />
                      <MapController onLegendToggle={() => setLegendOpen(!legendOpen)} />
                    </TogoMap>

                    {/* Légende overlay */}
                    <div className="absolute bottom-4 left-3 z-[1000]">
                      <MapLegend
                        activeLayer={activeLayer}
                        collapsed={!legendOpen}
                        onToggle={() => setLegendOpen(!legendOpen)}
                      />
                    </div>
                  </div>
                </Card>

                {/* Badge fraîcheur */}
                <div className="mt-2 flex items-center justify-end">
                  <Badge variant="info" size="sm">{t('badge.data_freshness')}</Badge>
                </div>
              </div>

              {/* TOP ZONES À INVESTIR — flex-1 (prend le reste) */}
              <div className="flex-1 min-w-0">
                <Card variant="default" padding="md" className="h-auto">

                  {activeLayer === 'synthesis' ? (
                    <div className="overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                      <TopZonesList
                        zones={allZones}
                        onZoneSelect={handleListZoneSelect}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                      <ListOrdered size={32} className="text-togo-green/20" />
                      <p className="text-xs text-text-secondary italic leading-relaxed max-w-[180px]">
                        {currentLang === 'en'
                          ? 'Select the Synthesis layer to see priority investment zones'
                          : 'Sélectionnez la couche Synthèse pour voir les zones prioritaires'}
                      </p>
                    </div>
                  )}
                </Card>
              </div>

            </div>{/* fin flex carte+zones */}
          </div>{/* fin section principale */}
        </div>{/* fin layout flex */}

        {/* Detail Panel overlay */}
        <div className="px-0">
          <PrefectureDetailPanel
            prefecture={selectedPrefectureData}
            onClose={() => {
              setSelectedPrefectureData(null);
              setSelectedPrefecture('');
            }}
          />
        </div>
      </div>
    </>
  );
}
