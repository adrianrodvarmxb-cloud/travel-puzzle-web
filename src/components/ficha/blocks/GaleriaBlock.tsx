import { imgLoading, transformedSrc, transformedSrcSet } from '@/perf/lib/image';
import type { GalleryLayout } from '@/ficha/lib/gallery';

/**
 * REQ-10809 · Bloque 2 «Galería» de la ficha única: 1 grande + 4; con una foto, foto única. Solo pinta el
 * `galleryLayout` ya calculado y el título para el texto alternativo (ISP). Sin hooks: sirve en servidor (DIP).
 */
export function GaleriaBlock({ layout, title }: { layout: GalleryLayout; title: string }) {
    if (layout.kind === 'none') return null;
    const main = layout.main;
    const mainImg = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={transformedSrc(main.url, 1200)}
            srcSet={transformedSrcSet(main.url, [640, 960, 1200])}
            sizes={layout.kind === 'single' ? '100vw' : '(max-width: 768px) 100vw, 50vw'}
            alt={main.alt ?? title}
            {...imgLoading(true)}
            className={layout.kind === 'single' ? 'h-72 w-full object-cover md:h-[450px]' : 'h-72 w-full object-cover md:col-span-2 md:row-span-2 md:h-full'}
        />
    );
    if (layout.kind === 'single') {
        return <section data-bloque="galeria" className="mb-10 overflow-hidden rounded-3xl">{mainImg}</section>;
    }
    return (
        <section data-bloque="galeria" className="mb-10 grid grid-cols-1 gap-2.5 overflow-hidden rounded-3xl md:grid-cols-4 md:grid-rows-[220px_220px]">
            {mainImg}
            {layout.side.map((m, k) => (
                <div key={m.url} className="relative hidden md:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={transformedSrc(m.url, 640)} alt={m.alt ?? ''} {...imgLoading(false)} className="h-full w-full object-cover" />
                    {k === layout.side.length - 1 && layout.more > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center bg-[#0A1330]/55 text-sm font-semibold text-white">+{layout.more}</span>
                    )}
                </div>
            ))}
        </section>
    );
}
