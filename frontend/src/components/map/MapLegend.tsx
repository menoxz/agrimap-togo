import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { AnalysisType } from '@/types/map';
import {
  DENSITY_CLASS_BREAKS,
  ZAAP_CLASS_BREAKS,
  ACCESS_CLASS_BREAKS,
  COOP_CLASS_BREAKS,
  SYNTHESIS_CLASS_BREAKS,
} from './layers';

interface MapLegendProps {
  activeLayer: AnalysisType;
  /** Repliable on mobile */
  collapsed?: boolean;
  onToggle?: () => void;
}

const LEGEND_TITLE_KEYS: Record<AnalysisType, string> = {
  density: 'map:legend.density',
  zaap: 'map:legend.zaap',
  access: 'map:legend.access',
  coop: 'map:legend.coop',
  synthesis: 'map:legend.synthesis',
};

/**
 * MapLegend — Dynamic legend that adapts to the active analysis layer.
 * Shows color classes with labels from i18n.
 * Repliable on mobile via accordion toggle.
 */
export default function MapLegend({
  activeLayer,
  collapsed = false,
  onToggle,
}: MapLegendProps) {
  const { t } = useTranslation();
  const [localCollapsed, setLocalCollapsed] = useState(collapsed);

  const isCollapsed = onToggle ? collapsed : localCollapsed;
  const toggle = onToggle || (() => setLocalCollapsed(!localCollapsed));

  const classBreaks = getClassBreaks(activeLayer);
  if (!classBreaks || classBreaks.length === 0) return null;

  return (
    <div className="bg-white/95 rounded-md shadow-md border border-border overflow-hidden text-body-sm min-w-[160px]">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-surface-alt transition-colors"
        aria-expanded={!isCollapsed}
      >
        <span className="flex items-center gap-1.5 font-medium text-text">
          <Eye size={14} className="text-primary" />
          <span>{t(LEGEND_TITLE_KEYS[activeLayer])}</span>
        </span>
        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* Color classes */}
      {!isCollapsed && (
        <div className="px-3 pb-2 space-y-1.5">
          {classBreaks.map((cls, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="block w-4 h-4 rounded-sm shrink-0 border border-border/50"
                style={{ backgroundColor: cls.color }}
                aria-hidden="true"
              />
              <span className="text-text-secondary text-caption">
                {cls.label}
              </span>
            </div>
          ))}

          {/* Colorblind safe badge */}
          <div className="pt-1.5 mt-1.5 border-t border-border/50">
            <span className="text-caption text-muted flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#1B5E20]" />
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#E8F5E9]" />
              <span className="ml-1">{t('map:legend.colorblind_safe')}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ClassBreak {
  color: string;
  label: string;
  min?: number;
  max?: number;
}

function getClassBreaks(layer: AnalysisType): ClassBreak[] | null {
  switch (layer) {
    case 'density':
      return DENSITY_CLASS_BREAKS.map((c) => ({ color: c.color, label: c.label }));
    case 'zaap':
      return ZAAP_CLASS_BREAKS.map((c) => ({ color: c.color, label: c.label }));
    case 'access':
      return ACCESS_CLASS_BREAKS.map((c) => ({ color: c.color, label: c.label }));
    case 'coop':
      return COOP_CLASS_BREAKS.map((c) => ({ color: c.color, label: c.label }));
    case 'synthesis':
      return SYNTHESIS_CLASS_BREAKS.map((c) => ({ color: c.color, label: c.label }));
    default:
      return null;
  }
}
