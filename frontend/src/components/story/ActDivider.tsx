interface ActDividerProps {
  nextAct: number;
  /** true quand l'acte précédent a un fond clair (ex: acte 2 jaune) */
  darkText?: boolean;
}

export function ActDivider({ nextAct, darkText = false }: ActDividerProps) {
  const lineClass   = darkText ? 'bg-black/20'                           : 'bg-white/20';
  const badgeClass  = darkText ? 'bg-black/10 text-black/40'             : 'bg-white/15 text-white/60';

  return (
    <div className="relative flex items-center gap-6 py-4 px-6 tablet:px-10">
      <div className={`flex-1 h-px ${lineClass}`} />
      <div
        className={`px-3 py-1 backdrop-blur-sm text-[11px] tracking-[0.15em] uppercase font-bold shrink-0 ${badgeClass}`}
      >
        — Acte {nextAct}
      </div>
      <div className={`flex-1 h-px ${lineClass}`} />
    </div>
  );
}
