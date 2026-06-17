import { X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrefectureDetailData {
  nom_prefecture: string;
  region: string;
  n_marches: number;
  n_cooperatives: number;
  n_exploitations: number;
  n_zaap: number;
  n_pepinieres: number;
  /** Score 0-100 */
  service_score: number;
  /** "Priorité haute" | "Priorité moyenne" | "Bien desservi" */
  priority_level: string;
  /** Hex colour that matches the priority level (e.g. "#D7191C") */
  color: string;
}

interface PrefectureDetailPanelProps {
  prefecture: PrefectureDetailData | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PrefectureDetailPanel — Fixed overlay panel for the selected prefecture.
 *
 * Reads fields that are present in `prefecture_synthesis.geojson` directly,
 * so no extra data fetching is needed. Displays:
 *   • Priority badge (colour-coded)
 *   • Service score progress bar
 *   • 4-cell indicators grid (marchés, coopératives, exploitations, ZAAP+pép.)
 *
 * Placed at z-[500]: above all map layers (highlight pane z=450, analysis z=400).
 * Renders nothing when `prefecture` is null.
 */
export default function PrefectureDetailPanel({
  prefecture,
  onClose,
}: PrefectureDetailPanelProps) {
  if (!prefecture) return null;

  const scorePct = Math.min(100, Math.max(0, Math.round(prefecture.service_score)));

  const indicators: Array<{ icon: string; label: string; value: number }> = [
    { icon: '🏪', label: 'Marchés',       value: prefecture.n_marches },
    { icon: '🤝', label: 'Coopératives',  value: prefecture.n_cooperatives },
    { icon: '🌾', label: 'Exploitations', value: prefecture.n_exploitations },
    { icon: '🏗',  label: 'ZAAP / Pép.',  value: prefecture.n_zaap + prefecture.n_pepinieres },
  ];

  return (
    <div className="fixed right-4 top-24 z-[500] w-72 bg-white rounded-xl shadow-xl p-4">
      {/* ── Close button ─────────────────────────────────────────────────── */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Fermer le panneau"
      >
        <X size={16} />
      </button>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="pr-8 mb-3">
        <h3 className="text-lg font-bold text-gray-900 leading-tight">
          {prefecture.nom_prefecture}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">{prefecture.region}</p>
        <span
          className="inline-block mt-1.5 rounded px-2 py-0.5 text-xs text-white font-medium"
          style={{ backgroundColor: prefecture.color }}
        >
          {prefecture.priority_level}
        </span>
      </div>

      {/* ── Service score ────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
            Score de service
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: prefecture.color }}
          >
            {scorePct}/100
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${scorePct}%`, backgroundColor: prefecture.color }}
          />
        </div>
      </div>

      {/* ── Indicators grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {indicators.map(({ icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center bg-gray-50 rounded-lg p-2.5 text-center"
          >
            <span className="text-lg leading-none mb-1">{icon}</span>
            <span className="text-base font-bold text-gray-900 tabular-nums">{value}</span>
            <span className="text-[11px] text-gray-500 mt-0.5">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
