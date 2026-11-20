import type { TaxonomyChip } from '@/ficha/lib/taxonomy-view';

/**
 * REQ-10814 · Bloque 4 «Taxonomía» de la ficha única. Solo pinta las etiquetas ya calculadas (ISP): el tipo primero,
 * luego temas y atributos. Sin etiquetas no pinta nada. Sin hooks: sirve en servidor (DIP).
 */
export function TaxonomiaBlock({ chips }: { chips: TaxonomyChip[] }) {
    if (chips.length === 0) return null;
    return (
        <ul data-bloque="taxonomia" className="mb-6 flex flex-wrap gap-2">
            {chips.map((c) => (
                <li key={c.slug} data-kind={c.kind} className={c.kind === 'tipo' ? 'rounded-full bg-[#EAF54F] px-2.5 py-1 text-xs font-bold text-[#0A1330]' : 'rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white'}>
                    {c.label}
                </li>
            ))}
        </ul>
    );
}
