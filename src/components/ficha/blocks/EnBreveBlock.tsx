/**
 * REQ-10816 · Bloque 6 «En breve» de la ficha única. Recibe el texto ya decidido (`briefText`: null en FREETOUR o si
 * nombra al operador) y su título en el idioma (ISP). Sin texto no pinta nada. Sin hooks: sirve en servidor (DIP).
 */
export function EnBreveBlock({ text, heading }: { text: string | null; heading: string }) {
    if (!text) return null;
    return (
        <section data-bloque="en-breve" className="mb-6 max-w-3xl rounded-2xl border border-white/10 bg-[#121D45] p-4 md:p-5">
            <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{heading}</h2>
            <p className="mt-2 text-base leading-relaxed text-[#E3E9F7]">{text}</p>
        </section>
    );
}
