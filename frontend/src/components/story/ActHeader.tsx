import { useEffect, useRef, useState } from 'react';

interface ActHeaderProps {
  actNumber: number;
  title: string;
  subtitle?: string;
  accentIndex: number; // 0–3
  /** light=true : thème clair (texte sombre sur fond pastel) */
  light?: boolean;
}

/**
 * Accents thème CLAIR — bandeau header en couleur pleine (drapeau togolais),
 * texte blanc. Le corps de l'acte reste sur fond pastel clair.
 */
const ACCENTS_LIGHT = [
  // Acte 1 — vert Togo officiel
  { bg: '#006A4E', ghost: 'rgba(255,255,255,0.15)', label: 'rgba(255,255,255,0.70)', title: '#FFFFFF' },
  // Acte 2 — ambre doré profond
  { bg: '#B07800', ghost: 'rgba(255,255,255,0.15)', label: 'rgba(255,255,255,0.70)', title: '#FFFFFF' },
  // Acte 3 — rouge Togo officiel
  { bg: '#D21034', ghost: 'rgba(255,255,255,0.15)', label: 'rgba(255,255,255,0.70)', title: '#FFFFFF' },
  // Acte 4 — ardoise marine
  { bg: '#2D4A80', ghost: 'rgba(255,255,255,0.15)', label: 'rgba(255,255,255,0.70)', title: '#FFFFFF' },
];

/**
 * Accents thème SOMBRE (conservés pour retro-compatibilité éventuelle).
 */
const ACCENTS_DARK = [
  { bg: 'rgba(0,180,120,0.12)',    ghost: 'rgba(0,220,150,0.13)', label: '#4ADE80', title: '#FFFFFF' },
  { bg: 'rgba(255,209,0,0.10)',    ghost: 'rgba(255,209,0,0.12)', label: '#FFD100', title: '#FFFFFF' },
  { bg: 'rgba(240,80,100,0.12)',   ghost: 'rgba(240,80,100,0.12)', label: '#FCA5A5', title: '#FFFFFF' },
  { bg: 'rgba(148,163,184,0.10)', ghost: 'rgba(148,163,184,0.10)', label: 'rgba(203,213,225,0.7)', title: '#FFFFFF' },
];

export function ActHeader({ actNumber, title, subtitle, accentIndex, light = false }: ActHeaderProps) {
  const ACCENTS = light ? ACCENTS_LIGHT : ACCENTS_DARK;
  const a = ACCENTS[accentIndex] ?? ACCENTS[0];

  const headerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
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
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={headerRef}
      className={`relative py-10 overflow-hidden ${isVisible ? 'act-header-visible' : ''}`}
      style={{ background: a.bg }}
    >
      {/* Ligne d'accent latérale gauche */}
      <div className="act-header-line" aria-hidden="true" />

      {/* Chiffre fantôme */}
      <span
        className="act-ghost-num absolute right-6 top-1/2 -translate-y-1/2
                   text-[6rem] font-black leading-none select-none pointer-events-none"
        style={{ color: a.ghost }}
        aria-hidden="true"
      >
        {String(actNumber).padStart(2, '0')}
      </span>

      <div className="relative z-10 px-6 tablet:px-10">
        <span
          className="act-label-reveal block text-[11px] font-bold uppercase tracking-[0.25em]"
          style={{ color: a.label }}
        >
          Acte {actNumber}
        </span>
        <h2
          className="act-title-reveal text-4xl tablet:text-5xl font-black tracking-tight mt-2 leading-tight"
          style={{ color: a.title }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="act-title-reveal mt-2 text-sm opacity-60" style={{ color: a.title, transitionDelay: '0.36s' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
