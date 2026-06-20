import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '@/components/ui/Button';
import { ArrowDown, Map } from 'lucide-react';

/**
 * StoryHero — Full-screen intro. Background fixe (même pattern qu'ExplorePage hero).
 * Photo agricole + overlay noir/65 + contenu centré avec fade-in.
 *
 * Améliorations scroll :
 *   - h1 animé mot par mot (stagger)
 *   - Overlay s'approfondit légèrement au scroll pour guider vers les actes
 *   - Scroll indicator qui disparaît au scroll
 */
export default function StoryHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleStart = () => {
    document.getElementById('act-1')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleExplore = () => navigate('/explore');

  // Parallax : le contenu remonte légèrement au scroll
  const contentOffset = Math.min(scrollY * 0.22, 60);
  // Overlay s'assombrit légèrement au scroll (max +15%)
  const overlayExtra = Math.min(scrollY / 800, 0.15);
  // Scroll indicator s'efface rapidement
  const indicatorOpacity = Math.max(0, 1 - scrollY / 120);

  // Découpe le titre en mots pour le stagger
  const heroTitle = t('story:story.hero.title');
  const words = heroTitle.split(' ');

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
      {/* Overlay principal */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${0.65 + overlayExtra})` }}
        aria-hidden="true"
      />

      {/* Barre tricolore en bas du hero */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 z-10"
        style={{ background: 'linear-gradient(90deg, #006A4E 33%, #FFD100 33% 66%, #D21034 66%)' }}
      />

      {/* Contenu centré — remonte légèrement au scroll (parallax doux) */}
      <div
        className={[
          'relative z-10 text-center px-6 max-w-3xl mx-auto',
          'transition-opacity duration-1000 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ transform: `translateY(-${contentOffset}px)` }}
      >
        {/* Eyebrow badge — apparaît avant le titre */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/8 backdrop-blur-sm mb-6 animate-cta-pop"
          style={{ animationDelay: '40ms' }}
        >
          <span className="w-2 h-2 rounded-full bg-togo-green shrink-0" aria-hidden="true" />
          <span className="text-white/65 text-[11px] font-semibold uppercase tracking-[0.22em]">
            Togo · Analyse Nationale · 2024
          </span>
          <span className="w-2 h-2 rounded-full bg-togo-red shrink-0" aria-hidden="true" />
        </div>

        {/* H1 : stagger mot par mot */}
        <h1 className="text-5xl tablet:text-6xl font-black tracking-tight text-white leading-tight mb-4 drop-shadow-lg">
          {words.map((word, i) => (
            <span
              key={i}
              className="inline-block animate-hero-word"
              style={{ animationDelay: `${100 + i * 75}ms` }}
            >
              {word}{i < words.length - 1 ? '\u00a0' : ''}
            </span>
          ))}
        </h1>

        {/* Sous-titre */}
        <p
          className="text-white/70 italic text-base font-medium mb-10 leading-relaxed drop-shadow animate-cta-pop"
          style={{ animationDelay: `${100 + words.length * 75 + 80}ms` }}
        >
          {t('story:story.hero.subtitle')}
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col tablet:flex-row items-center justify-center gap-4 animate-cta-pop"
          style={{ animationDelay: `${100 + words.length * 75 + 200}ms` }}
        >
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

      {/* Scroll indicator — disparaît au scroll */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce"
        style={{ opacity: indicatorOpacity, transition: 'opacity 0.2s ease' }}
        aria-hidden="true"
      >
        <ArrowDown size={24} className="text-white/60" />
      </div>
    </section>
  );
}
