import { useEffect, useState } from 'react';

interface StoryProgressNavProps {
  activeAct: number;
  actTitles: string[];
}

export function StoryProgressNav({ activeAct, actTitles }: StoryProgressNavProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const p = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      setProgress(Math.min(p, 100));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (i: number) => {
    document.getElementById(`act-${i + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="fixed top-[64px] left-0 right-0 z-40
                    bg-black/90 backdrop-blur-md border-b border-white/10 shadow-lg">
      {/* Barre de progression verte */}
      <div className="h-[2px] bg-white/10 w-full">
        <div
          className="h-full bg-togo-green transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4 tablet:gap-6">
          {actTitles.map((title, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`flex items-center gap-2 text-xs font-medium transition-all duration-200
                ${activeAct === i ? 'text-togo-yellow' : 'text-white/40 hover:text-white/70'}`}
            >
              <span
                className={`w-2 h-2 rounded-full transition-all duration-200
                  ${activeAct === i ? 'bg-togo-yellow scale-125' : 'bg-white/20'}`}
              />
              <span className="hidden tablet:block">{title}</span>
            </button>
          ))}
        </div>

        <span className="text-xs text-white/40 tablet:hidden">
          {activeAct + 1} / {actTitles.length}
        </span>
      </div>
    </nav>
  );
}
