import { useState } from 'react';
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import type { AnalysisType } from '@/types/map';
import { ANALYSIS_TYPES } from '@/utils/colors';

interface FilterPanelProps {
  selectedRegion: string;
  activeLayers: AnalysisType[];
  zaapOnlyUncovered: boolean;
  onRegionChange: (region: string) => void;
  onLayerToggle: (layer: AnalysisType) => void;
  onLayerSet: (layer: AnalysisType) => void;
  onZaapOnlyUncoveredChange: (value: boolean) => void;
  onReset: () => void;
  isFiltered: boolean;
  /** Dark variant — rendered inside a green sidebar (no Card, white text) */
  dark?: boolean;
}

const REGIONS = [
  { value: '', label: 'Toutes les régions' },
  { value: 'maritime', label: 'Maritime' },
  { value: 'plateaux', label: 'Plateaux' },
  { value: 'centrale', label: 'Centrale' },
  { value: 'kara', label: 'Kara' },
  { value: 'savanes', label: 'Savanes' },
];

const LAYER_LABELS: Record<AnalysisType, { fr: string; en: string }> = {
  density: { fr: 'Densité exploitations', en: 'Farm density' },
  zaap: { fr: 'Couverture ZAAP', en: 'ZAAP coverage' },
  access: { fr: 'Accessibilité marchés', en: 'Market accessibility' },
  coop: { fr: 'Réseau coopératif', en: 'Cooperative network' },
  synthesis: { fr: 'Synthèse priorisation', en: 'Prioritization' },
};

/**
 * FilterPanel — Side panel for map filters.
 * Desktop: fixed sidebar. Mobile: collapsible accordion.
 * Provides region dropdown, layer toggles (radio), ZAAP-specific toggle, reset.
 *
 * dark=true: flat rendering (no Card), white text — for use inside a green sidebar.
 */
export default function FilterPanel({
  selectedRegion,
  activeLayers,
  zaapOnlyUncovered,
  onRegionChange,
  onLayerSet,
  onZaapOnlyUncoveredChange,
  onReset,
  isFiltered,
  dark = false,
}: FilterPanelProps) {
  const { t, currentLang } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const layerOptions = ANALYSIS_TYPES.map((type) => ({
    value: type,
    label: LAYER_LABELS[type][currentLang === 'en' ? 'en' : 'fr'],
  }));

  /* ── Dark (green sidebar) variant ──────────────────────────────────────── */
  if (dark) {
    return (
      <div className="space-y-4">
        {/* Region filter */}
        <div>
          <label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
            🌍 {currentLang === 'en' ? 'Region' : 'Région'}
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full text-sm rounded-md border border-white/30 bg-white/15 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value} className="bg-togo-green-dark text-white">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Layer selection */}
        <div>
          <label className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 block">
            🗺 {currentLang === 'en' ? 'Analysis type' : "Type d'analyse"}
          </label>
          <div className="space-y-1">
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

        {/* Reset */}
        <button
          onClick={onReset}
          disabled={!isFiltered}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white/40 text-white text-sm font-semibold hover:bg-white/15 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <RotateCcw size={14} />
          {t('explore.reset')}
        </button>
      </div>
    );
  }

  /* ── Light (default) variant ────────────────────────────────────────────── */
  return (
    <>
      {/* Mobile/Tablet toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex desktop:hidden items-center gap-2 px-3 py-2 rounded-md border border-border text-body-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 self-start"
        aria-expanded={mobileOpen}
        aria-label={t('explore.filters')}
      >
        <SlidersHorizontal size={18} />
        <span>{t('explore.filters')}</span>
        {mobileOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Panel content */}
      <aside
        className={[
          'desktop:w-72 shrink-0',
          mobileOpen ? 'block' : 'hidden',
          'desktop:block',
        ].join(' ')}
        aria-label={t('explore.filters')}
      >
        <Card variant="default" padding="md" className="space-y-5">
          {/* Region filter */}
          <div>
            <label className="text-label text-text-secondary mb-2 block">
              🌍 {t('explore.filters')}
            </label>
            <Select
              options={REGIONS}
              value={selectedRegion}
              onChange={onRegionChange}
              placeholder="Sélectionner une région"
            />
          </div>

          {/* Layer selection */}
          <div>
            <label className="text-label text-text-secondary mb-2 block">
              🗺 Type d'analyse
            </label>
            <div className="space-y-2">
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
                  {currentLang === 'en' ? 'Show only uncovered zones' : 'Zones non couvertes uniquement'}
                </span>
              </label>
            </div>
          )}

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
