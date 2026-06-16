import { useEffect, useRef, useState } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * useScrollReveal — IntersectionObserver hook for scroll-triggered animations.
 * Returns a ref to attach to the element and a boolean indicating visibility.
 * Automatically disconnects after first reveal when triggerOnce is true (default).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) {
  const { threshold = 0.15, rootMargin = '0px 0px -60px 0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(el);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  /**
   * Global DOM observer — sélectionne TOUS les éléments portant une classe
   * scroll-reveal* et ajoute `.visible` quand ils entrent dans le viewport.
   * Complémentaire au ref-based observer ci-dessus.
   */
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale',
    );

    if (elements.length === 0) return;

    const globalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            globalObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );

    elements.forEach((el) => globalObserver.observe(el));
    return () => globalObserver.disconnect();
  }, []);

  return { ref, isVisible };
}
