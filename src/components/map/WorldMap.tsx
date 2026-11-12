'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMaplibre } from './maplibre';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn } from '@/home/lib/destinations';
import type { MapCity, CityCard as CityCardData } from '@/map/load';
import { CityCard } from './CityCard';

/** Fondo del mapa: OpenFreeMap, estilo Fiord (azul marino; gratis, sin llaves). */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/fiord';

/**
 * Mapa del inicio: ciudades con tours reales, agrupadas al alejar.
 * La librería se carga solo cuando el mapa entra en pantalla.
 */
export function WorldMap() {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [card, setCard] = useState<CityCardData | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const langRef = useRef(language);
  langRef.current = language;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let map: import('maplibre-gl').Map | null = null;
    let cancelled = false;

    // REQ-1578: un pin de lugar (solo viajes) pide su tarjeta por llave.
    const openCity = async (cityId: number, place?: string) => {
      setCardOpen(true);
      setCardLoading(true);
      setCard(null);
      const res = await fetch(place ? `/api/map/cities?place=${encodeURIComponent(place)}` : `/api/map/cities?cityId=${cityId}`).catch(() => null);
      const data = res?.ok ? ((await res.json()) as CityCardData) : null;
      if (!cancelled) {
        setCard(data);
        setCardLoading(false);
        if (!data) setCardOpen(false);
      }
    };

    const start = async () => {
      setStatus('loading');
      try {
        const [maplibregl, cities] = await Promise.all([
          loadMaplibre(),
          fetch('/api/map/cities').then((r) => (r.ok ? (r.json() as Promise<MapCity[]>) : [])),
        ]);
        if (cancelled || !el) return;
        const m = new maplibregl.Map({
          container: el,
          style: MAP_STYLE,
          center: [10, 30],
          zoom: 1.4,
          minZoom: 1,
          maxZoom: 14,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
        m.on('load', () => {
          const map = m;
          map.addSource('cities', {
            type: 'geojson',
            cluster: true,
            clusterRadius: 44,
            clusterMaxZoom: 7,
            clusterProperties: { tours: ['+', ['get', 'tours']] },
            data: {
              type: 'FeatureCollection',
              features: cities.map((x) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [x.lng, x.lat] },
                properties: { cityId: x.cityId, place: x.place ?? '', tours: x.tours, name: nameIn(x.names, langRef.current) },
              })),
            },
          });
          map.addLayer({
            id: 'clusters', type: 'circle', source: 'cities', filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#008DFF', 'circle-opacity': 0.85, 'circle-stroke-color': '#7CC4FF', 'circle-stroke-width': 1,
              'circle-radius': ['step', ['get', 'tours'], 14, 50, 18, 200, 24, 1000, 30],
            },
          });
          map.addLayer({
            id: 'cluster-count', type: 'symbol', source: 'cities', filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'tours'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 },
            paint: { 'text-color': '#ffffff' },
          });
          map.addLayer({
            id: 'city', type: 'circle', source: 'cities', filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': '#EAF54F', 'circle-radius': ['step', ['get', 'tours'], 6, 10, 8, 50, 10], 'circle-stroke-color': '#0A1330', 'circle-stroke-width': 2 },
          });
          map.addLayer({
            id: 'city-label', type: 'symbol', source: 'cities', filter: ['!', ['has', 'point_count']], minzoom: 4,
            layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, 1.3], 'text-anchor': 'top' },
            paint: { 'text-color': '#ffffff', 'text-halo-color': '#0A1330', 'text-halo-width': 1.5 },
          });
          map.on('click', 'clusters', async (e) => {
            const f = e.features?.[0];
            const src = map?.getSource('cities') as import('maplibre-gl').GeoJSONSource | undefined;
            if (!f || !src || f.geometry.type !== 'Point') return;
            const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id);
            map?.easeTo({ center: f.geometry.coordinates as [number, number], zoom });
          });
          map.on('click', 'city', (e) => {
            const props = e.features?.[0]?.properties;
            const id = Number(props?.cityId);
            const place = typeof props?.place === 'string' && props.place ? props.place : undefined;
            if (id || place) void openCity(id, place);
          });
          for (const layer of ['clusters', 'city']) {
            map.on('mouseenter', layer, () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', layer, () => { if (map) map.getCanvas().style.cursor = ''; });
          }
          setStatus('ready');
        });
        m.on('error', (e) => console.warn('[map]', e.error?.message));
      } catch (error) {
        console.error('[map] no se pudo iniciar:', error);
        if (!cancelled) setStatus('error');
      }
    };

    const io = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting)) {
        io.disconnect();
        void start();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      map?.remove();
    };
  }, []);

  return (
    <div className="tp-map relative h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-[#0E1A40] md:h-[600px]">
      <div ref={box} className="h-full w-full" />
      {status !== 'ready' && status !== 'error' && (
        <p className="font-data absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-[#A9B6D6]">{c.mapLoading}</p>
      )}
      {status === 'error' && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-[#A9B6D6]">{c.mapError}</p>}
      {cardOpen && <CityCard card={card} loading={cardLoading} onClose={() => setCardOpen(false)} />}
    </div>
  );
}
