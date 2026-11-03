/** Encabezado de sección del diseño tecnológico: etiqueta numerada + titular grande (+ acción opcional). */
export function SectionHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-3xl">
        <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">{eyebrow}</p>
        <h2 className="font-display text-4xl font-bold leading-[1.05] text-white md:text-5xl">{title}</h2>
        {subtitle && <p className="mt-3 text-lg text-[#A9B6D6]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
