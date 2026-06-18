import { useState, useEffect, useRef } from 'react';

/**
 * Anime un compteur de 0 → target quand `trigger` devient true.
 * Utilise requestAnimationFrame + easing cubic ease-out.
 * Retourne la valeur courante (entière).
 */
export function useAnimatedCounter(
  target: number,
  duration = 1500,
  trigger = true
): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) {
      setValue(0);
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, trigger]);

  return value;
}
