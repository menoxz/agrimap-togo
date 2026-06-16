import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazyActContainerProps {
  children: ReactNode;
  actId: number;
}

/**
 * LazyActContainer — Wraps a story act and only renders its children
 * when the section is near the viewport (IntersectionObserver with 200px rootMargin).
 *
 * Shows a skeleton placeholder before the act content is revealed.
 * Once revealed, children stay in the DOM (no re-hide on scroll away).
 */
export default function LazyActContainer({ children, actId }: LazyActContainerProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Note: cannot call observer.disconnect() here because the mock
          // fires the callback synchronously during construction (TDZ issue).
          // The cleanup function handles disconnection on unmount.
        }
      },
      {
        rootMargin: '200px',
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (isVisible) {
    return <div ref={sectionRef}>{children}</div>;
  }

  return (
    <div
      ref={sectionRef}
      data-lazy-act={actId}
      className="min-h-screen py-8 tablet:py-10 desktop:py-12"
    >
      <div className="container-page">
        {/* Skeleton placeholder matching ActContainer layout */}
        <div className="flex flex-col desktop:flex-row gap-6 desktop:gap-8 animate-pulse">
          {/* Text skeleton — 60% width */}
          <div className="w-full desktop:w-3/5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gray-200" />
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
            <div className="h-24 bg-gray-200 rounded-md" />
            <div className="h-12 bg-gray-200 rounded-md" />
          </div>
          {/* Map skeleton — 40% width */}
          <div className="w-full desktop:w-2/5">
            <div className="h-[350px] tablet:h-[400px] desktop:h-[500px] bg-gray-200 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
