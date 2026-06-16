import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import TogoMap from '@/components/map/TogoMap';
import { SynthesisLayer } from '@/components/map';
import MapController from '@/components/map/MapController';
import RecommendationCard from './RecommendationCard';
import { Target } from 'lucide-react';

interface Recommendation {
  title: string;
  description: string;
  priority: string;
  region: string;
}

const REC_KEYS = [
  { title: 'story:story.synthesis.rec_1_title', description: 'story:story.synthesis.rec_1_description', priority: 'story:story.synthesis.rec_1_priority', region: 'story:story.synthesis.rec_1_region' },
  { title: 'story:story.synthesis.rec_2_title', description: 'story:story.synthesis.rec_2_description', priority: 'story:story.synthesis.rec_2_priority', region: 'story:story.synthesis.rec_2_region' },
  { title: 'story:story.synthesis.rec_3_title', description: 'story:story.synthesis.rec_3_description', priority: 'story:story.synthesis.rec_3_priority', region: 'story:story.synthesis.rec_3_region' },
];

/**
 * SynthesisView — Dark-themed synthesis section : carte composite + recommandations.
 */
export default function SynthesisView() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const recommendations: Recommendation[] = REC_KEYS.map((keys) => ({
    title: t(keys.title),
    description: t(keys.description),
    priority: t(keys.priority),
    region: t(keys.region),
  }));

  return (
    <section
      id="synthesis"
      ref={sectionRef}
      className="min-h-screen py-8 tablet:py-10 desktop:py-12 scroll-mt-20"
      style={{ backgroundColor: '#006A4E' }}
    >
      <div
        className={[
          'container-page',
          'transition-all duration-700 ease-out',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        ].join(' ')}
      >
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <div className="shrink-0 w-10 h-10 rounded-full bg-togo-yellow
                          flex items-center justify-center font-bold text-black text-sm">
            S
          </div>
          <div>
            <h2 className="text-4xl tablet:text-5xl font-black tracking-tight text-white leading-tight">
              {t('story:story.synthesis.title')}
            </h2>
            <p className="text-white/65 text-sm mt-1">
              {t('story:story.synthesis.subtitle')}
            </p>
          </div>
        </div>

        {/* Corps */}
        <p className="text-white/80 leading-relaxed text-[15px] mb-6 max-w-3xl">
          {t('story:story.synthesis.body')}
        </p>

        {/* Carte pleine largeur */}
        <div className="rounded-xl overflow-hidden border border-white/20 shadow-2xl mb-8">
          <div className="h-[400px] tablet:h-[500px] desktop:h-[550px] relative">
            <TogoMap scrollWheelZoom={true}>
              <SynthesisLayer visible={true} />
              <MapController />
            </TogoMap>
          </div>
        </div>

        {/* Recommandations */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target size={20} className="text-togo-yellow" />
            <h3 className="text-xl font-bold text-white">Recommandations</h3>
          </div>
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
            {recommendations.map((rec, i) => (
              <RecommendationCard
                key={i}
                title={rec.title}
                description={rec.description}
                priority={rec.priority}
                region={rec.region}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
