import { useEffect, useRef, useState } from 'react';

interface ActDividerProps {
  nextAct: number;
  /** true quand l'acte précédent a un fond clair (ex: acte 2 jaune) */
  darkText?: boolean;
}

/**
 * ActDivider — séparateur entre deux actes.
 * Reveal animé : scaleX(0.6) → scaleX(1) au scroll via IntersectionObserver.
 * CSS prête dans globals.css : .act-divider-reveal + .act-item-visible
 */
export function ActDivider({ nextAct, darkText = false }: ActDividerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const lineClass  = darkText ? 'bg-black/20'         : 'bg-white/20';
  const badgeClass = darkText ? 'bg-black/10 text-black/40' : 'bg-white/15 text-white/60';

  return (
    <div
      ref={ref}
      className={[
        'act-divider-reveal',
        'relative flex items-center gap-6 py-4 px-6 tablet:px-10',
        isVisible ? 'act-item-visible' : '',
      ].join(' ')}
    >
      <div className={`flex-1 h-px ${lineClass}`} />
      <div
        className={`px-3 py-1 backdrop-blur-sm text-[11px] tracking-[0.15em] uppercase font-bold shrink-0 ${badgeClass}`}
      >
        Acte {nextAct}
      </div>
      <div className={`flex-1 h-px ${lineClass}`} />
    </div>
  );
}
