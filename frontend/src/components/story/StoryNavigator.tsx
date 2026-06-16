import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'story-hero', label: 'Intro', number: '' },
  { id: 'act-1', label: 'Acte 1', number: '1' },
  { id: 'act-2', label: 'Acte 2', number: '2' },
  { id: 'act-3', label: 'Acte 3', number: '3' },
  { id: 'act-4', label: 'Acte 4', number: '4' },
  { id: 'synthesis', label: 'Synthèse', number: 'S' },
];

/**
 * StoryNavigator — Vertical side navigation with numbered circles.
 * Desktop: fixed sidebar on the left.
 * Mobile: horizontal bar at the bottom.
 * Active dot = filled circle, inactive = outline.
 * Clicking scrolls smoothly to the target section.
 */
export default function StoryNavigator() {
  const [activeId, setActiveId] = useState('story-hero');

  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id);

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the section with the highest intersection ratio
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }
        if (bestEntry) {
          setActiveId(bestEntry.target.id);
        }
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
        rootMargin: '-80px 0px -40% 0px',
      },
    );

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter to story sections (act-1 to synthesis) for the navigator
  const navSections = SECTIONS.filter((s) => s.id !== 'story-hero');

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        aria-label="Navigation des actes"
        className="hidden desktop:flex fixed left-4 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-4"
      >
        {navSections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => handleClick(section.id)}
              aria-label={section.label}
              aria-current={isActive ? 'true' : undefined}
              className={[
                'w-10 h-10 rounded-full flex items-center justify-center text-body-sm font-bold transition-all duration-300',
                'focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2',
                isActive
                  ? 'bg-primary text-white shadow-md scale-110'
                  : 'bg-white text-muted border-2 border-border hover:border-primary hover:text-primary',
              ].join(' ')}
            >
              {section.number}
            </button>
          );
        })}
      </nav>

      {/* Mobile: horizontal bottom bar */}
      <nav
        aria-label="Navigation des actes"
        className="desktop:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg"
      >
        <div className="flex items-center justify-around px-2 py-2 overflow-x-auto">
          {navSections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleClick(section.id)}
                aria-label={section.label}
                aria-current={isActive ? 'true' : undefined}
                className={[
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-md min-w-[48px] transition-all',
                  'focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2',
                  isActive ? 'text-primary' : 'text-muted',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold transition-all',
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-transparent border border-border',
                  ].join(' ')}
                >
                  {section.number}
                </span>
                <span className="text-caption truncate max-w-[56px]">
                  {section.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
