'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { mosaicLayout } from '@/trips/lib/gallery-layout';

type Img = { url: string; alt: string };

/** REQ-042: mosaico que se acomoda al número de fotos (como "Destinos" del home); al tocar una foto se abre el visor. */
export function TripGallery({ images, title }: { images: Img[]; title: string }) {
    const [open, setOpen] = useState<number | null>(null);
    const l = mosaicLayout(images.length);
    if (!l.shown) return null;
    return (
        <>
            <div className={`${l.grid} overflow-hidden rounded-2xl`}>
                {images.slice(0, l.shown).map((im, j) => (
                    <button key={im.url} type="button" onClick={() => setOpen(j)} aria-label={`Ver foto ${j + 1} de ${images.length}`}
                        className={`group relative block overflow-hidden bg-[#1B2A5E] ${images.length > 1 ? 'rounded-xl' : 'rounded-2xl'} ${l.tiles[j]}`}>
                        <img src={im.url} alt={im.alt || title} loading={j === 0 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {j === l.shown - 1 && l.extra > 0 && (
                            <span className="absolute inset-0 flex items-center justify-center bg-[#0A1330]/60 font-display text-xl font-bold text-white">+{l.extra}</span>
                        )}
                    </button>
                ))}
            </div>
            {open !== null && <GalleryViewer images={images} title={title} start={open} onClose={() => setOpen(null)} />}
        </>
    );
}

/** Visor a pantalla completa: la galería anterior (foto grande + flechas + miniaturas), ahora dentro de un modal. */
function GalleryViewer({ images, title, start, onClose }: { images: Img[]; title: string; start: number; onClose: () => void }) {
    useEffect(() => {
        const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [onClose]);
    return (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A1330]/95 p-4" onClick={onClose}>
            <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 flex justify-end">
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">✕</button>
                </div>
                <TripGallerySlider images={images} title={title} start={start} />
            </div>
        </div>
    );
}

/** Galería: foto grande + miniaturas desplazables (se puede mover a mano en escritorio y celular). */
export function TripGallerySlider({ images, title, start = 0 }: { images: Img[]; title: string; start?: number }) {
    const [i, setI] = useState(start);
    if (!images.length) return null;
    const cur = images[i];
    return (
        <div>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#1B2A5E]">
                <img src={cur.url} alt={cur.alt || title} className="h-full w-full object-cover" />
                {images.length > 1 && (
                    <>
                        <button type="button" aria-label="Anterior" onClick={() => setI((i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-[#0A1330]/70 px-3 py-2 text-white">←</button>
                        <button type="button" aria-label="Siguiente" onClick={() => setI((i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#0A1330]/70 px-3 py-2 text-white">→</button>
                    </>
                )}
                {cur.alt && <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0A1330]/90 to-transparent px-4 pb-3 pt-8 text-sm text-white">{cur.alt}</p>}
            </div>
            {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {images.map((im, j) => (
                        <button key={im.url} type="button" onClick={() => setI(j)} aria-label={`Foto ${j + 1}`} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${j === i ? 'border-[#EAF54F]' : 'border-transparent opacity-70'}`}>
                            <img src={im.url} alt="" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
