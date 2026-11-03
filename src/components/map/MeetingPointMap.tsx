'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMaplibre } from './maplibre';
import type { LatLng } from '@/map/lib/coords';
import { MAP_STYLE } from './WorldMap';

/** Mapa pequeño con el punto de encuentro (se carga solo al verse). */
export function MeetingPointMap({ point, label }: { point: LatLng; label: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let map: import('maplibre-gl').Map | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries.some((x) => x.isIntersecting)) return;
      io.disconnect();
      const maplibregl = await loadMaplibre();
      if (cancelled) return;
      const m = new maplibregl.Map({ container: el, style: MAP_STYLE, center: [point.lng, point.lat], zoom: 15, cooperativeGestures: true, attributionControl: { compact: true } });
      map = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      new maplibregl.Marker({ color: '#C12909' }).setLngLat([point.lng, point.lat]).addTo(m);
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      map?.remove();
    };
  }, [point.lat, point.lng]);

  return <div ref={box} role="img" aria-label={label} className="tp-map h-64 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0E1A40]" />;
}
