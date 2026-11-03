import { slug, type LegalBlock } from '@/legal/lib/blocks';

interface LegalDocumentProps {
  eyebrow: string;
  title: string;
  blocks: LegalBlock[];
  /** Aviso opcional arriba del texto (p. ej. "solo en español"). */
  notice?: React.ReactNode;
}

/** Muestra un documento legal con índice de secciones. Solo presenta: el texto llega por props. */
export function LegalDocument({ eyebrow, title, blocks, notice }: LegalDocumentProps) {
  const sections = blocks.filter((b): b is Extract<LegalBlock, { type: 'h2' }> => b.type === 'h2');

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">{eyebrow}</p>
      <h1 className="font-display text-4xl font-bold leading-[1.05] text-white md:text-5xl">{title}</h1>
      {notice}

      {sections.length > 2 && (
        <nav aria-label="Contenido" className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <ol className="grid gap-1.5 text-sm text-[#A9B6D6] sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.text}>
                <a href={`#${slug(s.text)}`} className="hover:text-white">{s.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-[#D5DCEE]">
        {blocks.map((b, i) => {
          switch (b.type) {
            case 'h2':
              return (
                <h2 key={i} id={slug(b.text)} className="font-display scroll-mt-24 pt-6 text-2xl font-bold text-white">
                  {b.text}
                </h2>
              );
            case 'h3':
              return <h3 key={i} className="pt-2 text-lg font-semibold text-white">{b.text}</h3>;
            case 'list':
              return (
                <ul key={i} className="list-none space-y-2 border-l border-white/15 pl-4">
                  {b.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              );
            default:
              return <p key={i}>{b.text}</p>;
          }
        })}
      </div>
    </article>
  );
}
