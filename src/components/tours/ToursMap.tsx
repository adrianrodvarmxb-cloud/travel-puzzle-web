'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMaplibre } from '@/components/map/maplibre';
import { MAP_STYLE } from '@/components/map/WorldMap';
import { useLanguage } from '@/lib/language-context';
import { priceText } from '@/tours/lib/booking-cta';
import type { TourPin } from '@/tours/lib/map-pins';

interface ToursMapProps {
  pins: TourPin[];
  /** Tour resaltado desde la lista (al pasar el mouse). */
  activeId?: string | null;
}

/** Mapa de /tours: un pin con el precio por tour de la página actual; al tocarlo abre una tarjeta. */
export function ToursMap({ pins, activeId }: ToursMapProps) {
  const { t } = useLanguage();
  const free = t('tours.free', 'Free');
  // REQ-271: el pin dice «Pieza libre»; la tarjeta del pin conserva el precio verde «Free tour».
  const pin = t('tours.freePin', 'Free tour');
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const libRef = useRef<typeof import('maplibre-gl') | null>(null);
  const markers = useRef(new Map<string, { marker: import('maplibre-gl').Marker; el: HTMLButtonElement }>());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<TourPin | null>(null);

  // Arranca el mapa cuando entra en pantalla.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries.some((x) => x.isIntersecting)) return;
      io.disconnect();
      try {
        const lib = await loadMaplibre();
        if (cancelled) return;
        libRef.current = lib;
        const m = new lib.Map({ container: el, style: MAP_STYLE, center: [10, 30], zoom: 1.4, maxZoom: 16, attributionControl: { compact: true } });
        m.addControl(new lib.NavigationControl({ showCompass: false }), 'bottom-right');
        m.on('load', () => !cancelled && setReady(true));
        m.on('click', () => setSelected(null));
        mapRef.current = m;
        // Si el contenedor cambia de tamaño (lista ↔ mapa en celular), el mapa se reacomoda.
        ro = new ResizeObserver(() => m.resize());
        ro.observe(el);
      } catch (error) {
        console.error('[tours-map] no se pudo iniciar:', error);
        if (!cancelled) setFailed(true);
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Pines: se rehacen cuando cambian los tours de la página.
  useEffect(() => {
    const m = mapRef.current;
    const lib = libRef.current;
    if (!ready || !m || !lib) return;
    for (const { marker } of markers.current.values()) marker.remove();
    markers.current.clear();
    setSelected(null);
    if (pins.length === 0) return;

    const bounds = new lib.LngLatBounds();
    for (const p of pins) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tp-pin';
      el.textContent = priceText(p.price, p.currency, pin);
      el.setAttribute('aria-label', p.title);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelected(p);
      });
      const marker = new lib.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
      markers.current.set(p.id, { marker, el });
      bounds.extend([p.lng, p.lat]);
    }
    m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
  }, [pins, ready, pin]);

  // Resalta el pin del tour activo o seleccionado.
  useEffect(() => {
    const on = selected?.id ?? activeId ?? null;
    for (const [id, { el }] of markers.current) el.classList.toggle('tp-pin--on', id === on);
  }, [activeId, selected, pins, ready]);

  return (
    <div className="tp-map relative h-full min-h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0E1A40]">
      <div ref={box} className="h-full w-full" />
      {!ready && !failed && (
        <p className="font-data absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-[#A9B6D6]">{t('tours.map.loading', 'Loading map…')}</p>
      )}
      {failed && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-[#A9B6D6]">{t('tours.map.error', "We couldn't load the map.")}</p>}
      {ready && pins.length === 0 && (
        <p className="absolute inset-x-4 bottom-10 rounded-xl bg-[#0A1330]/90 px-4 py-3 text-center text-sm text-[#A9B6D6]">{t('tours.map.empty', 'No meeting points to show on this page.')}</p>
      )}
      {selected && (
        <div className="absolute inset-x-3 top-3 overflow-hidden rounded-2xl border border-white/15 bg-[#121D45] shadow-2xl sm:inset-x-auto sm:left-3 sm:w-80">
          <button type="button" onClick={() => setSelected(null)} aria-label={t('common.close', 'Close')} className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#0A1330]/80 text-white hover:bg-[#0A1330]">×</button>
          <Link href={`/tours/${selected.id}`} className="flex gap-3 p-3 text-white">
            {selected.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.image} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0 pr-6">
              <p className="line-clamp-2 font-semibold leading-snug">{selected.title}</p>
              <p className="mt-1 font-semibold text-[#EAF54F]">{priceText(selected.price, selected.currency, free)}</p>
              <p className="mt-1 text-sm font-semibold text-[#008DFF]">{t('tours.map.view', 'View tour')} →</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
