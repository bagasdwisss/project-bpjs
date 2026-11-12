import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * Komponen angka KPI beranimasi halus (easeOutExpo) yang langsung melompat ke nilai akhir
 * saat prefers-reduced-motion aktif.
 */
export default function AnimatedNumber({ value = 0, duration = 650, decimals = 0 }) {
  const numericTarget = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [displayValue, setDisplayValue] = useState(numericTarget);
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayValue(numericTarget);
      prevValueRef.current = numericTarget;
      return undefined;
    }

    const startVal = prevValueRef.current;
    const diff = numericTarget - startVal;
    if (Math.abs(diff) < 0.0001) {
      setDisplayValue(numericTarget);
      return undefined;
    }

    let frameId = null;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = startVal + diff * eased;
      setDisplayValue(current);

      if (t < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = numericTarget;
      }
    };

    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      prevValueRef.current = numericTarget;
    };
  }, [numericTarget, duration]);

  const formatted = decimals > 0
    ? Number(displayValue).toFixed(decimals)
    : Math.round(displayValue).toLocaleString('id-ID');

  return <span className="tabular-nums">{formatted}</span>;
}
