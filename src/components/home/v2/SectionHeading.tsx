export function SectionHeading({ eyebrow, title, subtitle, dark = false }: { eyebrow?: string; title: string; subtitle?: string; dark?: boolean }) {
  return (
    <div className="mb-10 text-center">
      {eyebrow && <p className={`mb-2 font-mono text-xs uppercase tracking-[0.3em] ${dark ? 'text-[#EAF54F]' : 'text-[#008DFF]'}`}>{eyebrow}</p>}
      <h2 className={`text-3xl font-bold md:text-4xl ${dark ? 'text-white' : 'text-[#0A1330]'}`}>{title}</h2>
      {subtitle && <p className={`mx-auto mt-3 max-w-2xl text-lg ${dark ? 'text-white/75' : 'text-gray-600'}`}>{subtitle}</p>}
    </div>
  );
}
