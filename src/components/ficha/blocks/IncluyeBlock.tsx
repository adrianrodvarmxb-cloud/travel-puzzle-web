import type { IncludesView } from '@/ficha/lib/practical-view';

/**
 * REQ-10828 · Bloque 10 «Incluye / No incluye» de la ficha única. Recibe solo las dos listas ya limpias y sus títulos
 * (ISP); una columna si falta la otra, nada si faltan las dos. Sin hooks: sirve en servidor (DIP).
 */
export function IncluyeBlock({ view, headings }: { view: IncludesView; headings: { incluye: string; noIncluye: string } }) {
    if (view.columns === 0) return null;
    return (
        <section data-bloque="incluye" data-columnas={view.columns} className={`mb-8 grid gap-6 ${view.columns === 2 ? 'md:grid-cols-2' : ''}`}>
            {view.includes.length > 0 && (
                <div>
                    <h2 className="mb-3 font-display text-xl font-bold text-white">{headings.incluye}</h2>
                    <ul className="space-y-2">
                        {view.includes.map((s) => (
                            <li key={s} className="flex gap-2 text-[#E3E9F7]"><span aria-hidden className="text-[#EAF54F]">✓</span><span>{s}</span></li>
                        ))}
                    </ul>
                </div>
            )}
            {view.excludes.length > 0 && (
                <div>
                    <h2 className="mb-3 font-display text-xl font-bold text-white">{headings.noIncluye}</h2>
                    <ul className="space-y-2">
                        {view.excludes.map((s) => (
                            <li key={s} className="flex gap-2 text-[#E3E9F7]"><span aria-hidden className="text-white/50">✕</span><span>{s}</span></li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
