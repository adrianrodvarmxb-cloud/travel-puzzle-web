'use client';

import { useEffect } from 'react';

/**
 * Al llegar al inicio desde otra página con #seccion, el navegador salta antes de que carguen
 * las fotos y el mapa, y la sección queda más abajo. Repite el salto cuando la página termina de acomodarse.
 */
export function HashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const go = () => document.getElementById(id)?.scrollIntoView({ block: 'start' });
    const timers = [300, 1200, 2500].map((ms) => window.setTimeout(go, ms));
    // Si la persona ya empezó a moverse, no la regresamos.
    const stop = () => timers.forEach((t) => window.clearTimeout(t));
    window.addEventListener('touchstart', stop, { once: true, passive: true });
    window.addEventListener('wheel', stop, { once: true, passive: true });
    return () => {
      stop();
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('wheel', stop);
    };
  }, []);
  return null;
}
