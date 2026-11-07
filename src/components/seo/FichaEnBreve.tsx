/**
 * REQ-577 / REQ-581: «En breve» (respuesta primero) bajo el H1, con el tipo principal y las etiquetas como texto
 * fuera de la foto. Presentacional, sin hooks ni Intl (sirve en servidor y cliente, INC-001). Solo se pinta si el
 * proveedor permite enriquecimiento (REQ-570): quien lo usa pasa `text` null en FREETOUR.
 */
export function FichaEnBreve({ text, tipo, etiquetas = [], lang = 'es', tone = 'dark' }: { text: string | null; tipo?: string | null; etiquetas?: string[]; lang?: string; tone?: 'dark' }) {
    if (!text) return null;
    const chips = [...(tipo ? [tipo] : []), ...etiquetas.filter((e) => e !== tipo)];
    return (
        <section data-seo="en-breve" data-tone={tone} className="mt-5 max-w-3xl rounded-2xl border border-white/10 bg-[#121D45] p-4 md:p-5">
            <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{lang === 'es' ? 'En breve' : 'At a glance'}</h2>
            <p className="mt-2 text-base leading-relaxed text-[#E3E9F7]">{text}</p>
            {chips.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={lang === 'es' ? 'Tipo y etiquetas' : 'Type and tags'}>
                    {chips.map((c, i) => (
                        <li key={c} data-seo={i === 0 && tipo ? 'tipo' : 'etiqueta'} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">{c}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}
