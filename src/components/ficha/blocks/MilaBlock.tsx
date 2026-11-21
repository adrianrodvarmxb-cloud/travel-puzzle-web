import type { MilaBlockView } from '@/ficha/lib/closing-view';

/**
 * REQ-10840 · Bloque 17 «Mila» de la ficha única, al cierre de las preguntas: liga a WhatsApp con el código, la fecha,
 * las personas y la opción (decisión 41) y el aviso de que es una asistente con IA. Recibe solo su vista (ISP); null en
 * FREETOUR o sin número. No lee banderas (DIP): `milaEnabled` lo decide `blocks.ts`.
 */
export function MilaBlock({ view }: { view: MilaBlockView | null }) {
    if (!view) return null;
    return (
        <section data-bloque="mila" className="mb-8 rounded-xl border border-[#008DFF]/40 bg-[#008DFF]/10 p-5">
            <h2 className="mb-2 font-display text-xl font-bold text-white">{view.heading}</h2>
            <p className="mb-4 text-[#E3E9F7]">{view.body}</p>
            <a href={view.href} target="_blank" rel="noopener noreferrer" data-mila className="inline-flex rounded-xl bg-[#008DFF] px-5 py-3 font-semibold text-white hover:bg-[#0077d9]">
                {view.cta}
            </a>
        </section>
    );
}
