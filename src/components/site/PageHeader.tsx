import { Breadcrumbs } from '@/components/destinations/Breadcrumbs';

/** Cabecera de página interna con el patrón de /traslados: migas, etiqueta, H1 y bajada. Sin hooks. */
export function PageHeader({ crumbs, eyebrow, title, lead, children }: {
  crumbs: { name: string; href: string }[];
  eyebrow: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-6 pt-8 md:pt-12">
      <Breadcrumbs items={crumbs} />
      <p className="font-data mt-8 text-xs uppercase tracking-[0.3em] text-[#EAF54F]">{eyebrow}</p>
      <h1 className="font-display mt-2 text-4xl font-bold leading-[1.05] text-white md:text-6xl">{title}</h1>
      {lead && <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#C9D6F5] md:text-lg">{lead}</p>}
      {children}
    </section>
  );
}

/** Tarjeta oscura del sitio (borde azul de marca). */
export function DarkCard({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#008DFF]/45 bg-[#0E1A40] p-6 ${className}`}>
      {title && <h3 className="font-display text-lg font-bold text-white">{title}</h3>}
      <div className={title ? 'mt-2 text-[15px] leading-relaxed text-[#C9D6F5]' : 'text-[15px] leading-relaxed text-[#C9D6F5]'}>{children}</div>
    </div>
  );
}
