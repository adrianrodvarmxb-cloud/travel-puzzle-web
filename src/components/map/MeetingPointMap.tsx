'use client';

import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMaplibre } from './maplibre';
import type { LatLng } from '@/map/lib/coords';
import { zoneCircle, zoneZoom } from '@/map/lib/zone';
import { MAP_STYLE } from './WorldMap';

/**
 * Mapa pequeño con el punto de encuentro (se carga solo al verse). Con `radiusM` (REQ-10736, «Zona aproximada»),
 * en vez del marcador pinta un círculo de ese radio centrado en el punto, con un zoom que lo deja ver completo.
 */
export function MeetingPointMap({ point, label, radiusM }: { point: LatLng; label: string; radiusM?: number }) {
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
      const zoom = radiusM ? zoneZoom(radiusM) : 15;
      const m = new maplibregl.Map({ container: el, style: MAP_STYLE, center: [point.lng, point.lat], zoom, cooperativeGestures: true, attributionControl: { compact: true } });
      map = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      if (radiusM) {
        // REQ-10736: círculo de «Zona aproximada», sin marcador (no hay un punto exacto que señalar).
        m.on('load', () => {
          if (cancelled) return;
          m.addSource('zona', { type: 'geojson', data: zoneCircle(point, radiusM) });
          m.addLayer({ id: 'zona-relleno', type: 'fill', source: 'zona', paint: { 'fill-color': '#C12909', 'fill-opacity': 0.18 } });
          m.addLayer({ id: 'zona-borde', type: 'line', source: 'zona', paint: { 'line-color': '#C12909', 'line-width': 2 } });
        });
      } else {
        new maplibregl.Marker({ color: '#C12909' }).setLngLat([point.lng, point.lat]).addTo(m);
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      map?.remove();
    };
  }, [point.lat, point.lng, radiusM]);

  return <div ref={box} role="img" aria-label={label} className="tp-map h-64 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0E1A40]" />;
}
