import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Lightbulb, HelpCircle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import TogoMap from '@/components/map/TogoMap';
import MapController from '@/components/map/MapController';

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

  return (
    <div
      id={`act-content-${actNumber}`}
      ref={sectionRef}
      className="min-h-screen py-8 tablet:py-10 desktop:py-12 scroll-mt-20"
    >
      <div
        className={[
          'container-page',
          'transition-all duration-700 ease-out',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        ].join(' ')}
      >
        <div className="flex flex-col desktop:flex-row gap-6 desktop:gap-8">

          {/* Colonne texte — 60 % */}
          <div className="w-full desktop:w-3/5 space-y-5">

            {/* Header acte */}
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${tk.circle}`}>
                {actNumber}
              </div>
              <div>
                <h2 className={`text-2xl font-bold leading-snug ${tk.h2}`}>{title}</h2>
                <p className={`text-sm mt-0.5 ${tk.sub}`}>{subtitle}</p>
              </div>
            </div>

            {/* Corps narratif */}
            <p className={`leading-relaxed text-[15px] ${tk.body}`}>{body}</p>

            {/* Encadré key finding */}
            <div className={`rounded-lg border p-4 flex gap-3 ${tk.findingBox}`}>
              <Lightbulb size={20} className={`shrink-0 mt-0.5 ${tk.findingIco}`} />
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${tk.findingLbl}`}>
                  {keyLabel}
                </p>
                <p className={`text-sm italic leading-relaxed ${tk.findingTxt}`}>{keyFinding}</p>
              </div>
            </div>

            {/* Question guide */}
            <div className="flex gap-3 items-start">
              <HelpCircle size={18} className={`shrink-0 mt-0.5 ${tk.qIco}`} />
              <p className={`text-sm font-medium leading-relaxed ${tk.qTxt}`}>{question}</p>
            </div>

            {/* Badge acte */}
            <Badge variant="primary" size="md">
              {`Acte ${actNumber} / 4`}
            </Badge>
          </div>

          {/* Colonne carte — 40 % */}
          <div className="w-full desktop:w-2/5">
            <div className="desktop:sticky desktop:top-24">
              <div className={`rounded-xl overflow-hidden border ${tk.mapBorder}`}>
                <div className="h-[350px] tablet:h-[400px] desktop:h-[500px] relative">
                  <TogoMap scrollWheelZoom={true}>
                    {layerComponent}
                    <MapController />
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
