import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `target` with easeOutExpo.
 *
 * - key === 0  → display 0 immediately (reset state)
 * - key > 0    → animate from 0 → target over `duration` ms
 */
export function useCountUp(
  target: number,
  key: number,
  duration = 1200,
  delay = 0,
): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  const delayRafRef = useRef(0);

  useEffect(() => {
    // Cancel any in-flight animation
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(delayRafRef.current);

    // key=0 means "show zero" — no animation
    if (key === 0 || target === 0) {
      setValue(0);
      return;
    }

    setValue(0);
    let start: number | null = null;

    const animate = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo: fast ramp, satisfying deceleration
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    if (delay > 0) {
      const t0 = performance.now();
      const wait = (ts: number) => {
        if (ts - t0 >= delay) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          delayRafRef.current = requestAnimationFrame(wait);
        }
      };
      delayRafRef.current = requestAnimationFrame(wait);
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(delayRafRef.current);
    };
  }, [target, key, duration, delay]);

  return value;
}
