import { SlidersHorizontal, RotateCcw, Download, Globe, MapPin, Map, ShoppingCart, Handshake, Wheat, Sprout, Leaf } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import type { AnalysisType } from '@/types/map';
import { ANALYSIS_TYPES } from '@/utils/colors';
import { LAYER_GEOJSON_URLS, LAYER_FILE_SLUGS } from './layers';

interface FilterPanelProps {
  selectedRegion: string;
  /** Currently selected prefecture name ('' = all) */
  selectedPrefecture?: string;
  activeLayers: AnalysisType[];
  zaapOnlyUncovered: boolean;
  onRegionChange: (region: string) => void;
  /** Called when prefecture selection changes */
  onPrefectureChange?: (prefecture: string) => void;
  onLayerToggle: (layer: AnalysisType) => void;
  onLayerSet: (layer: AnalysisType) => void;
  onZaapOnlyUncoveredChange: (value: boolean) => void;
  onReset: () => void;
  isFiltered: boolean;
  /** Dark variant — rendered inside a green sidebar (no Card, white text) */
  dark?: boolean;
  /** Set of active marker overlay types */
  visibleMarkers?: Set<string>;
  /** Called when a marker type checkbox is toggled */
  onMarkerToggle?: (type: string) => void;
  /** Whether the prefecture (ADM2) polygon layer is visible */
  showPrefectures?: boolean;
  /** Called when the prefecture layer toggle changes */
  onPrefecturesToggle?: (value: boolean) => void;
}

const REGIONS: { value: string; labelFr: string; labelEn: string }[] = [
  { value: '', labelFr: 'Toutes les régions', labelEn: 'All regions' },
  { value: 'maritime', labelFr: 'Maritime', labelEn: 'Maritime' },
  { value: 'plateaux', labelFr: 'Plateaux', labelEn: 'Plateaux' },
  { value: 'centrale', labelFr: 'Centrale', labelEn: 'Centrale' },
  { value: 'kara', labelFr: 'Kara', labelEn: 'Kara' },
  { value: 'savanes', labelFr: 'Savanes', labelEn: 'Savanes' },
];

/**
 * Prefectures organised by lowercase region key (matches REGIONS.value).
 * Values are title-case to match `properties.prefecture` in GeoJSON markers
 * and `properties.nom_prefecture` in prefecture_synthesis.geojson.
 */
const PREFECTURES_BY_REGION: Record<string, string[]> = {
  maritime: ['Ave', 'Bas-Mono', 'Golfe', 'Lacs', 'Lome Commune', 'Vo', 'Yoto', 'Zio'],
  plateaux: ['Agou', 'Akébou', 'Amou', 'Anié', 'Danyi', 'Est-Mono', 'Haho', 'Kloto', 'Kpélé', 'Moyen-Mono', 'Ogou', 'Wawa'],
  centrale: ['Blitta', 'Plaine de Mô', 'Sotouboua', 'Tchamba', 'Tchaoudjo'],
  kara: ['Assoli', 'Bassar', 'Binah', 'Dankpen', 'Doufelgou', 'Keran', 'Kozah'],
  savanes: ['Cinkassé', 'Kpendjal', 'Oti', 'Tandjouare', 'Tone'],
};

/** All 37 prefectures sorted alphabetically (shown when no region is selected). */
const ALL_PREFECTURES = Object.values(PREFECTURES_BY_REGION).flat().sort();

const LAYER_LABELS: Record<AnalysisType, { fr: string; en: string }> = {
  density: { fr: 'Densité exploitations', en: 'Farm density' },
  zaap: { fr: 'Couverture ZAAP', en: 'ZAAP coverage' },
  access: { fr: 'Accessibilité marchés', en: 'Market accessibility' },
  coop: { fr: 'Réseau coopératif', en: 'Cooperative network' },
  synthesis: { fr: 'Synthèse priorisation', en: 'Prioritization' },
};
// TODO: migrate to t() i18n keys

const MARKER_OPTIONS = [
  { value: 'marches',       icon: ShoppingCart, labelFr: 'Marchés',        labelEn: 'Markets',       count: 971, disabled: false },
  { value: 'cooperatives',  icon: Handshake,    labelFr: 'Coopératives',   labelEn: 'Cooperatives',  count: 55,  disabled: false },
  { value: 'exploitations', icon: Wheat,        labelFr: 'Exploitations',  labelEn: 'Farmland',      count: 737, disabled: false },
  { value: 'zaap',          icon: Sprout,       labelFr: 'ZAAP',           labelEn: 'ZAAP',          count: 0,   disabled: true  },
  { value: 'pepinieres',    icon: Leaf,         labelFr: 'Pépinières',     labelEn: 'Nurseries',     count: 0,   disabled: true  },
] as const;

// ── Download helpers (no external deps — standard Web API only) ────────────

/** Trigger GeoJSON download by navigating to its static URL. */
function handleDownloadGeoJSON(layer: AnalysisType): void {
  const url = LAYER_GEOJSON_URLS[layer];
  const a = document.createElement('a');
  a.href = url;
  a.download = `agrimap-${LAYER_FILE_SLUGS[layer]}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Fetch the GeoJSON, extract properties (no geometry), convert to CSV,
 * and trigger a download.
 */
async function handleDownloadCSV(layer: AnalysisType): Promise<void> {
  const url = LAYER_GEOJSON_URLS[layer];
  const res = await fetch(url);
  if (!res.ok) return;
  const geojson = (await res.json()) as { features: Array<{ properties: Record<string, unknown> }> };
  const features = geojson.features;
  if (!features?.length) return;

  const headers = Object.keys(features[0].properties);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csvLines = [
    headers.join(','),
    ...features.map((f) => headers.map((h) => escape(f.properties[h])).join(',')),
  ];

  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `agrimap-${LAYER_FILE_SLUGS[layer]}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

/**
 * FilterPanel — Side panel for map filters.
 * Desktop: fixed sidebar. Mobile: collapsible accordion.
 * Provides region dropdown, layer toggles (radio), ZAAP-specific toggle, reset.
 *
 * dark=true: flat rendering (no Card), white text — for use inside a green sidebar.
 */
export default function FilterPanel({
  selectedRegion,
  selectedPrefecture = '',
  activeLayers,
  zaapOnlyUncovered,
  onRegionChange,
  onPrefectureChange,
  onLayerSet,
  onZaapOnlyUncoveredChange,
  onReset,
  isFiltered,
  dark = false,
  visibleMarkers = new Set<string>(),
  onMarkerToggle,
  showPrefectures = false,
  onPrefecturesToggle,
}: FilterPanelProps) {
  const { t, currentLang } = useTranslation();

  const layerOptions = ANALYSIS_TYPES.map((type) => ({
    value: type,
    label: LAYER_LABELS[type][currentLang === 'en' ? 'en' : 'fr'],
  }));

  /** Cascaded prefecture list: filtered by region when one is selected. */
  const availablePrefectures = selectedRegion
    ? (PREFECTURES_BY_REGION[selectedRegion] ?? [])
    : ALL_PREFECTURES;

  /* ── Dark (green sidebar) variant ──────────────────────────────────────── */
  if (dark) {
    return (
      <div className="space-y-4">
        {/* Region filter */}
        <div>
          <label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
            <Globe className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {currentLang === 'en' ? 'Region' : 'Région'}
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => {
              onRegionChange(e.target.value);
              onPrefectureChange?.('');
            }}
            className="w-full text-sm rounded-md border border-white/30 bg-white/15 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value} className="bg-togo-green-dark text-white">
                {currentLang === 'en' ? r.labelEn : r.labelFr}
              </option>
            ))}
          </select>
        </div>

        {/* Prefecture filter (cascade) */}
        <div>
          <label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
            <MapPin className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {currentLang === 'en' ? 'Prefecture' : 'Préfecture'}
          </label>
          <select
            value={selectedPrefecture}
            onChange={(e) => onPrefectureChange?.(e.target.value)}
            className="w-full text-sm rounded-md border border-white/30 bg-white/15 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <option value="" className="bg-togo-green-dark text-white">
              {currentLang === 'en' ? 'All prefectures' : 'Toutes les préfectures'}
            </option>
            {availablePrefectures.map((p) => (
              <option key={p} value={p} className="bg-togo-green-dark text-white">
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
            <Map className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {currentLang === 'en' ? 'Analysis type' : "Type d'analyse"}
          </label>
          <div className="space-y-1.5">
            {layerOptions.map((opt) => {
              const isActive = activeLayers.includes(opt.value as AnalysisType);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2.5 py-1.5 transition-colors ${
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="analysis-dark"
                    value={opt.value}
                    checked={isActive}
                    onChange={() => onLayerSet(opt.value as AnalysisType)}
                    className="w-4 h-4 accent-white"
                  />
                  <span className={`text-sm transition-colors ${isActive ? 'text-white font-semibold' : 'text-white/80'}`}>
                    {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ZAAP-specific toggle */}
        {activeLayers.includes('zaap') && (
          <div className="pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={zaapOnlyUncovered}
                onChange={(e) => onZaapOnlyUncoveredChange(e.target.checked)}
                className="w-4 h-4 rounded accent-white"
              />
              <span className="text-sm text-white/90">
                {currentLang === 'en' ? 'Only uncovered zones' : 'Zones non couvertes uniquement'}
              </span>
            </label>
          </div>
        )}

        {/* Prefecture layer toggle */}
        <div>
          <label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
            <Map className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {t('explore.prefecture_layer')}
          </label>
          <label
            className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2.5 py-1.5 transition-colors ${
              showPrefectures ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
          >
            <input
              type="checkbox"
              checked={showPrefectures}
              onChange={(e) => onPrefecturesToggle?.(e.target.checked)}
              className="w-4 h-4 rounded accent-white"
            />
            <span className={`text-sm transition-colors ${showPrefectures ? 'text-white font-semibold' : 'text-white/80'}`}>
              {t('explore.show_prefectures')}
            </span>
          </label>
        </div>

        {/* ── SERVICES section ── */}
        <div>
          <label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
            <MapPin className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> Services
          </label>
          <div className="space-y-1.5">
            {MARKER_OPTIONS.map((opt) => {
              const isActive = visibleMarkers.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2.5 py-1.5 transition-colors ${
                    opt.disabled ? 'opacity-40 cursor-not-allowed' :
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    disabled={opt.disabled}
                    onChange={() => !opt.disabled && onMarkerToggle?.(opt.value)}
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span className={`text-sm transition-colors ${isActive ? 'text-white font-semibold' : 'text-white/80'}`}>
                    <opt.icon className="w-3.5 h-3.5 inline-block" aria-hidden="true" />&nbsp;
                    {currentLang === 'en' ? opt.labelEn : opt.labelFr}
                    <span className="ml-1 text-white/50 text-xs font-normal">({opt.count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          disabled={!isFiltered}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white/40 text-white text-sm font-semibold hover:bg-white/15 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <RotateCcw size={14} />
          {t('explore.reset')}
        </button>

        {/* ── Download buttons ── */}
        <div className="pt-1">
          <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1.5">
            {t('explore.download_title')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadGeoJSON(activeLayers[0] ?? 'density')}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/30 bg-white/10 text-white text-xs font-semibold hover:bg-white/20 active:scale-95 transition-all"
            >
              <Download size={11} />
              {t('explore.download_geojson')}
            </button>
            <button
              onClick={() => { void handleDownloadCSV(activeLayers[0] ?? 'density'); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-togo-yellow/60 bg-togo-yellow/10 text-togo-yellow text-xs font-semibold hover:bg-togo-yellow/20 active:scale-95 transition-all"
            >
              <Download size={11} />
              {t('explore.download_csv')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Light (default) variant ────────────────────────────────────────────── */
  return (
    <>
      {/* Mobile/Tablet toggle button */}
      <button
        className="flex desktop:hidden items-center gap-2 px-3 py-2 rounded-md border border-border text-body-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 self-start"
      >
        <SlidersHorizontal size={18} />
        <span>{t('explore.filters')}</span>
      </button>

      {/* Panel content */}
      <aside
        className="desktop:w-72 shrink-0 hidden desktop:block"
        aria-label={t('explore.filters')}
      >
        <Card variant="default" padding="md" className="space-y-5">
          {/* Region filter */}
          <div>
            <label className="text-xs uppercase tracking-wider text-text-secondary mb-2 block">
              <Globe className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {t('explore.region_label')}
            </label>
            <Select
              options={REGIONS.map((r) => ({ value: r.value, label: currentLang === 'en' ? r.labelEn : r.labelFr }))}
              value={selectedRegion}
              onChange={onRegionChange}
              placeholder={t('explore.region_placeholder')}
            />
            {selectedRegion && (
              <div className="space-y-1.5 mt-3">
                <label className="text-xs font-medium text-text-secondary">
                  <MapPin className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {t('map:prefecture_label')}
                </label>
                <select
                  value={selectedPrefecture}
                  onChange={(e) => onPrefectureChange?.(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary truncate"
                >
                  <option value="">{currentLang === 'en' ? 'All prefectures' : 'Toutes les préfectures'}</option>
                  {selectedRegion && PREFECTURES_BY_REGION[selectedRegion]?.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Layer selection */}
          <div>
            <label className="text-label text-text-secondary mb-2 block">
              <Map className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {t('explore.analysis_type_label')}
            </label>
            <div className="space-y-1.5">
              {layerOptions.map((opt) => {
                const isActive = activeLayers.includes(opt.value as AnalysisType);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 cursor-pointer group rounded px-2 py-1.5 transition-colors ${
                      isActive ? 'bg-primary-light/40' : 'hover:bg-surface-alt'
                    }`}
                  >
                    <input
                      type="radio"
                      name="analysis"
                      value={opt.value}
                      checked={isActive}
                      onChange={() => onLayerSet(opt.value as AnalysisType)}
                      className="w-4 h-4 text-primary border-border focus:ring-primary"
                    />
                    <span className="text-body-sm text-text-secondary group-hover:text-text transition-colors">
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ZAAP-specific filter */}
          {activeLayers.includes('zaap') && (
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zaapOnlyUncovered}
                  onChange={(e) => onZaapOnlyUncoveredChange(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-body-sm text-text-secondary">
                  {currentLang === 'en' ? 'Only uncovered zones' : 'Zones non couvertes uniquement'}
                </span>
              </label>
            </div>
          )}

          {/* Prefecture layer toggle */}
          <div>
            <label className="text-label text-text-secondary mb-2 block">
              <Map className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> {t('explore.prefecture_layer')}
            </label>
            <label
              className={`flex items-center gap-2 cursor-pointer group rounded px-2 py-1.5 transition-colors ${
                showPrefectures ? 'bg-primary-light/40' : 'hover:bg-surface-alt'
              }`}
            >
              <input
                type="checkbox"
                checked={showPrefectures}
                onChange={(e) => onPrefecturesToggle?.(e.target.checked)}
                className="w-4 h-4 text-primary border-border focus:ring-primary"
              />
              <span className="text-body-sm text-text-secondary group-hover:text-text transition-colors">
                {t('explore.show_prefectures')}
              </span>
            </label>
          </div>

          {/* ── SERVICES section ── */}
          <div>
            <label className="text-label text-text-secondary mb-2 block">
              <MapPin className="w-4 h-4 inline-block text-inherit" aria-hidden="true" /> Services
            </label>
            <div className="space-y-1.5">
              {MARKER_OPTIONS.map((opt) => {
                const isActive = visibleMarkers.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 cursor-pointer group rounded px-2 py-1.5 transition-colors ${
                      opt.disabled ? 'opacity-40 cursor-not-allowed' :
                      isActive ? 'bg-primary-light/40' : 'hover:bg-surface-alt'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={opt.disabled}
                      onChange={() => !opt.disabled && onMarkerToggle?.(opt.value)}
                      className="w-4 h-4 text-primary border-border focus:ring-primary"
                    />
                    <span className="text-body-sm text-text-secondary group-hover:text-text transition-colors">
                      <opt.icon className="w-3.5 h-3.5 inline-block" aria-hidden="true" />&nbsp;
                      {currentLang === 'en' ? opt.labelEn : opt.labelFr}
                      <span className="ml-1 text-text-secondary/60 text-xs">({opt.count})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Download buttons */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-text-secondary mb-2">{t('explore.download_title')}</p>
            <div className="flex gap-2">
              <button onClick={() => handleDownloadGeoJSON(activeLayers[0] ?? 'density')} className="flex-1 rounded-lg bg-surface-alt hover:bg-border px-3 py-2 text-xs font-medium text-text-primary transition-colors truncate">{t('explore.download_geojson')}</button>
              <button onClick={() => handleDownloadCSV(activeLayers[0] ?? 'density')} className="flex-1 rounded-lg bg-surface-alt hover:bg-border px-3 py-2 text-xs font-medium text-text-primary transition-colors truncate">{t('explore.download_csv')}</button>
            </div>
          </div>

          {/* Reset button */}
          <Button
            variant="outline"
            size="sm"
            color="primary"
            icon={RotateCcw}
            fullWidth
            disabled={!isFiltered}
            onClick={onReset}
          >
            {t('explore.reset')}
          </Button>
        </Card>
      </aside>
    </>
  );
}
