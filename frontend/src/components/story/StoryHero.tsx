import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '@/components/ui/Button';
import { ArrowDown, Map } from 'lucide-react';

/**
 * StoryHero — Full-screen intro. Background fixe (même pattern qu'ExplorePage hero).
 * Photo agricole + overlay noir/65 + contenu centré avec fade-in.
 */
export default function StoryHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    document.getElementById('act-1')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleExplore = () => navigate('/explore');

  return (
    <section
      id="story-hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(/images/hero-agriculture.jpg)',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }}
    >
      {/* Overlay noir — même densité que le hero Explorer */}
      <div className="absolute inset-0 bg-black/65" aria-hidden="true" />

      {/* Barre tricolore en bas du hero */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 z-10"
        style={{ background: 'linear-gradient(90deg, #006A4E 33%, #FFD100 33% 66%, #D21034 66%)' }}
      />

      {/* Contenu centré */}
      <div
        className={[
          'relative z-10 text-center px-6 max-w-3xl mx-auto',
          'transition-all duration-1000 ease-out',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        ].join(' ')}
      >
        <h1 className="text-5xl tablet:text-6xl font-black tracking-tight text-white leading-tight mb-4 drop-shadow-lg">
          {t('story:story.hero.title')}
        </h1>
        <p className="text-white/70 italic text-base font-medium mb-10 leading-relaxed drop-shadow">
          {t('story:story.hero.subtitle')}
        </p>
        <div className="flex flex-col tablet:flex-row items-center justify-center gap-4">
          <Button
            variant="filled"
            size="lg"
            color="primary"
            icon={ArrowDown}
            onClick={handleStart}
            className="px-8 py-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            {t('story:story.hero.cta')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            color="primary"
            icon={Map}
            onClick={handleExplore}
            className="px-8 py-4 hover:-translate-y-0.5 transition-all duration-200"
          >
            {t('story:story.hero.explore')}
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <ArrowDown size={24} className="text-white/60" />
      </div>
    </section>
  );
}
