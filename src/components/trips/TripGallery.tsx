'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';

/** Galería: foto grande + miniaturas desplazables (se puede mover a mano en escritorio y celular). */
export function TripGallery({ images, title }: { images: { url: string; alt: string }[]; title: string }) {
    const [i, setI] = useState(0);
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
