/**
 * REQ-10818 · Bloque 8 «Descripción» de la ficha única. Recibe el HTML ya saneado por `descriptionHtml` (solo p, br,
 * strong, em, b, i, ul, ol, li, sin atributos) y su título (ISP); sin texto no pinta nada. Sin hooks (DIP).
 */
export function DescripcionBlock({ html, heading }: { html: string | null; heading: string }) {
    if (!html) return null;
    return (
        <section data-bloque="descripcion" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{heading}</h2>
            <div className="prose prose-invert max-w-none text-[#E3E9F7]" dangerouslySetInnerHTML={{ __html: html }} />
        </section>
    );
}
