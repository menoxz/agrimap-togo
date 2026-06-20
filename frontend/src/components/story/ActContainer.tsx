import { useEffect, useRef, useState, type ReactNode, isValidElement, cloneElement } from 'react';
import { Lightbulb, HelpCircle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import TogoMap from '@/components/map/TogoMap';
import MapController from '@/components/map/MapController';
import { MapFlyTo } from '@/components/map/MapFlyTo';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

interface ActContainerProps {
  actNumber: number;
  title: string;
  subtitle: string;
  body: string;
  keyFinding: string;
  question: string;
  layerComponent: ReactNode;
  onVisible?: () => void;
  /** light=true : thème clair (fond pastel flag colors), dark=false par défaut */
  light?: boolean;
  /** Nombre à animer dans l'encadré key finding (optionnel) */
  keyStat?: number;
  /** Suffixe affiché après le nombre animé (ex: '%', ' km') */
  keyStatSuffix?: string;
  /** Centre cible pour map flyTo (coordonnées [lat, lng]) */
  mapTarget?: [number, number] | null;
  /** Région à surligner dans la couche (ex: 'centrale', 'kara') */
  highlightedRegion?: string | null;
}

/**
 * ActContainer — Scroll section pairing narrative + map.
 * Supports light (pastel, dark text) and dark (photo overlay, white text) themes.
 * Layout: 60 % text + 40 % map on desktop, stacked on mobile.
 */
export default function ActContainer({
  actNumber,
  title,
  subtitle,
  body,
  keyFinding,
  question,
  layerComponent,
  onVisible,
  light = false,
  keyStat,
  keyStatSuffix = '',
  mapTarget,
  highlightedRegion,
}: ActContainerProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); onVisible?.(); }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  /* ── Tokens thème ─────────────────────────────────────────────────────── */
  const tk = light
    ? {
        circle:    'bg-black/8 border-black/15 text-gray-700',
        h2:        'text-gray-900',
        sub:       'text-gray-500',
        body:      'text-gray-700',
        findingBox:'border-amber-300/60 bg-amber-50',
        findingIco:'text-amber-600',
        findingLbl:'text-amber-700',
        findingTxt:'text-gray-600',
        qIco:      'text-gray-400',
        qTxt:      'text-gray-500',
        mapBorder: 'border-black/10 shadow-md',
      }
    : {
        circle:    'bg-white/10 border-white/20 text-white',
        h2:        'text-white',
        sub:       'text-white/55',
        body:      'text-white/70',
        findingBox:'border-togo-yellow/30 bg-togo-yellow/8',
        findingIco:'text-togo-yellow',
        findingLbl:'text-togo-yellow',
        findingTxt:'text-white/75',
        qIco:      'text-white/40',
        qTxt:      'text-white/55',
        mapBorder: 'border-white/10 shadow-2xl',
      };

  const keyLabel =
    actNumber === 1 ? 'À retenir'
    : actNumber === 2 ? 'Constats'
    : actNumber === 3 ? 'Observation'
    : 'Point clé';

  // Référence pour observer la visibilité de l'encadré key finding
  const findingRef = useRef<HTMLDivElement>(null);
  const [findingVisible, setFindingVisible] = useState(false);

  useEffect(() => {
    const el = findingRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFindingVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animatedStat = useAnimatedCounter(keyStat ?? 0, 1500, findingVisible);

  return (
    <div
      id={`act-content-${actNumber}`}
      ref={sectionRef}
      className="min-h-screen py-8 tablet:py-10 desktop:py-12 scroll-mt-20"
    >
      <div className="container-page">
        <div className="flex flex-col desktop:flex-row gap-6 desktop:gap-8">

          {/* Colonne texte — 60 % — éléments staggerés */}
          <div className="w-full desktop:w-3/5 space-y-5">

            {/* 1 — Header acte */}
            <div
              className={`act-stagger-item flex items-start gap-3${isVisible ? ' act-item-visible' : ''}`}
              style={{ transitionDelay: '0ms' }}
            >
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${tk.circle}`}>
                {actNumber}
              </div>
              <div>
                <h2 className={`text-2xl font-bold leading-snug ${tk.h2}`}>{title}</h2>
                <p className={`text-sm mt-0.5 ${tk.sub}`}>{subtitle}</p>
              </div>
            </div>

            {/* 2 — Corps narratif */}
            <p
              className={`act-stagger-item leading-relaxed text-[15px] ${tk.body}${isVisible ? ' act-item-visible' : ''}`}
              style={{ transitionDelay: '110ms' }}
            >
              {body}
            </p>

            {/* 3 — Encadré key finding */}
            <div
              ref={findingRef}
              className={`act-stagger-item rounded-lg border p-4 flex gap-3 ${tk.findingBox}${isVisible ? ' act-item-visible' : ''}`}
              style={{ transitionDelay: '230ms' }}
            >
              <Lightbulb size={20} className={`shrink-0 mt-0.5 ${tk.findingIco}`} />
              <div className="flex-1">
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${tk.findingLbl}`}>
                  {keyLabel}
                </p>
                {keyStat != null && (
                  <div className="text-3xl font-black mb-1 text-amber-600">
                    {animatedStat}{keyStatSuffix && <span className="text-lg font-normal">{keyStatSuffix}</span>}
                  </div>
                )}
                <p className={`text-sm italic leading-relaxed ${tk.findingTxt}`}>{keyFinding}</p>
              </div>
            </div>

            {/* 4 — Question guide */}
            <div
              className={`act-stagger-item flex gap-3 items-start${isVisible ? ' act-item-visible' : ''}`}
              style={{ transitionDelay: '360ms' }}
            >
              <HelpCircle size={18} className={`shrink-0 mt-0.5 ${tk.qIco}`} />
              <p className={`text-sm font-medium leading-relaxed ${tk.qTxt}`}>{question}</p>
            </div>

            {/* 5 — Badge acte */}
            <div
              className={`act-stagger-item${isVisible ? ' act-item-visible' : ''}`}
              style={{ transitionDelay: '480ms' }}
            >
              <Badge variant="primary" size="md">
                {`Acte ${actNumber} / 4`}
              </Badge>
            </div>
          </div>

          {/* Colonne carte — 40 % — slide depuis la droite */}
          <div className="w-full desktop:w-2/5">
            <div className="desktop:sticky desktop:top-24">
              <div
                className={`act-map-reveal rounded-xl overflow-hidden border ${tk.mapBorder}${isVisible ? ' act-map-visible' : ''}`}
              >
                <div className="h-[350px] tablet:h-[400px] desktop:h-[500px] relative">
                  <TogoMap scrollWheelZoom={true}>
                    {highlightedRegion && isValidElement(layerComponent)
                      ? cloneElement(layerComponent, { highlightedRegion } as any)
                      : layerComponent
                    }
                    <MapController />
                    {mapTarget && <MapFlyTo target={mapTarget} zoom={8} duration={1.5} />}
                  </TogoMap>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
