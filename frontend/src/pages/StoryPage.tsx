import { Suspense, lazy, useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  StoryHero,
  ActContainer,
  StoryNavigator,
  ShareWidget,
} from '@/components/story';
import LazyActContainer from '@/components/story/LazyActContainer';
import { StoryProgressNav } from '@/components/story/StoryProgressNav';
import { ActHeader } from '@/components/story/ActHeader';
import { ActDivider } from '@/components/story/ActDivider';
import { DensityLayer, ZAAPLayer, AccessibilityLayer, CoopLayer } from '@/components/map';
import '@/styles/story-print.css';

/** Lazy-loaded SynthesisView (code-split: map + recommendations loaded on demand) */
const SynthesisView = lazy(() => import('@/components/story/SynthesisView'));

/**
 * Fonds clairs par acte — couleurs drapeau togolais désaturées / pastel.
 * Ni trop vifs ni trop sombres : lisibles avec texte foncé, identité visuelle
 * distincte par acte tout en restant agréables à l'œil.
 */
const ACT_STYLES = [
  { bg: '#C8E8D8', border: '#6AB89A' },  // Acte 1 — vert Togo saturé
  { bg: '#FDE68A', border: '#D4A000' },  // Acte 2 — jaune Togo saturé
  { bg: '#FAC8D0', border: '#D94060' },  // Acte 3 — rouge Togo saturé
  { bg: '#D1D8E8', border: '#7A90B8' },  // Acte 4 — ardoise visible
] as const;

/** dividers sur fonds clairs → texte sombre */
const ACT_DIVIDER_DARK = [true, true, true] as const;

/** Map act index to its corresponding layer component */
function getLayerComponent(actIndex: number): React.ReactNode {
  switch (actIndex) {
    case 0:
      return <DensityLayer visible={true} />;
    case 1:
      return <ZAAPLayer visible={true} />;
    case 2:
      return <AccessibilityLayer visible={true} />;
    case 3:
      return <CoopLayer visible={true} />;
    default:
      return null;
  }
}

/**
 * StoryPage — Guided reading experience with scroll narrative.
 *
 * Sections:
 *   1. StoryHero (full-screen intro)
 *   2. ActContainer × 4 (act1-DensityLayer, act2-ZAAPLayer, act3-AccessibilityLayer, act4-CoopLayer)
 *   3. SynthesisView (with SynthesisLayer + 3 RecommendationCards)
 *
 * Features:
 *   - Scroll ↔ layer synchronization via IntersectionObserver
 *   - StoryNavigator (vertical dots on desktop, horizontal bar on mobile)
 *   - StoryProgressNav (fixed top bar with progress + act navigation)
 *   - ShareWidget (floating share button)
 *   - Print CSS support
 */
export default function StoryPage() {
  const { t } = useTranslation();

  const [activeAct, setActiveAct] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      for (let i = 3; i >= 0; i--) {
        const el = document.getElementById(`act-${i + 1}`);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) {
          setActiveAct(i);
          return;
        }
      }
      setActiveAct(0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /** Short titles for StoryProgressNav buttons (from common namespace) */
  const actTitles = [
    t('story.act1.nav_title'),
    t('story.act2.nav_title'),
    t('story.act3.nav_title'),
    t('story.act4.nav_title'),
  ];

  /** Long titles for ActHeader (from common namespace — different from story: namespace) */
  const actHeaderTitles = [
    t('story.act1.title'),
    t('story.act2.title'),
    t('story.act3.title'),
    t('story.act4.title'),
  ];

  const actSections = [
    {
      actNumber: 1,
      title: t('story:story.act1.title'),
      subtitle: t('story:story.act1.subtitle'),
      body: t('story:story.act1.body'),
      keyFinding: t('story:story.act1.key_finding'),
      question: t('story:story.act1.question'),
      layerIndex: 0,
    },
    {
      actNumber: 2,
      title: t('story:story.act2.title'),
      subtitle: t('story:story.act2.subtitle'),
      body: t('story:story.act2.body'),
      keyFinding: t('story:story.act2.key_finding'),
      question: t('story:story.act2.question'),
      layerIndex: 1,
    },
    {
      actNumber: 3,
      title: t('story:story.act3.title'),
      subtitle: t('story:story.act3.subtitle'),
      body: t('story:story.act3.body'),
      keyFinding: t('story:story.act3.key_finding'),
      question: t('story:story.act3.question'),
      layerIndex: 2,
    },
    {
      actNumber: 4,
      title: t('story:story.act4.title'),
      subtitle: t('story:story.act4.subtitle'),
      body: t('story:story.act4.body'),
      keyFinding: t('story:story.act4.key_finding'),
      question: t('story:story.act4.question'),
      layerIndex: 3,
    },
  ];

  return (
    <>
      <StoryProgressNav activeAct={activeAct} actTitles={actTitles} />

      <div className="relative min-h-screen bg-gray-50 pt-[96px]">
        {/* Navigation — sidebar on desktop, bottom bar on mobile */}
        <StoryNavigator />

        {/* Section 1: Hero */}
        <StoryHero />

        {/* Sections 2-5: Acts 1-4 — fonds pastel clairs flag colors */}
        {actSections.map((act, i) => (
          <section
            key={act.actNumber}
            id={`act-${act.actNumber}`}
            className="scroll-mt-[96px] py-0"
            style={{
              backgroundColor: ACT_STYLES[i].bg,
              borderTop: `1px solid ${ACT_STYLES[i].border}`,
            }}
          >
            <div>
              <ActHeader
                actNumber={act.actNumber}
                title={actHeaderTitles[i]}
                accentIndex={i}
                light={true}
              />
              <LazyActContainer actId={act.actNumber}>
                <ActContainer
                  actNumber={act.actNumber}
                  title={act.title}
                  subtitle={act.subtitle}
                  body={act.body}
                  keyFinding={act.keyFinding}
                  question={act.question}
                  layerComponent={getLayerComponent(act.layerIndex)}
                  light={true}
                />
              </LazyActContainer>

              {i < actSections.length - 1 && (
                <ActDivider nextAct={act.actNumber + 1} darkText={ACT_DIVIDER_DARK[i]} />
              )}
            </div>
          </section>
        ))}

        {/* Section 6: Synthesis — lazy-loaded on demand */}
        <Suspense
          fallback={
            <div className="min-h-screen py-8 tablet:py-10 desktop:py-12">
              <div className="container-page space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-[400px] bg-gray-200 rounded-md" />
              </div>
            </div>
          }
        >
          <SynthesisView />
        </Suspense>

        {/* Share widget */}
        <ShareWidget />
      </div>
    </>
  );
}
