'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy, waLink } from '@/home/lib/copy';

/** `eyebrow`: etiqueta numerada propia cuando se usa fuera del inicio (p. ej. /nosotros); sin ella, la del inicio. */
export function ExpertCta({ whatsapp, eyebrow }: { whatsapp?: string; eyebrow?: string }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const href = waLink(whatsapp, c.expertWa);
  if (!href) return null;

  return (
    <section id="asesor" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 py-24 md:px-8 md:py-28">
      <div className="grid grid-cols-1 items-center gap-6 rounded-3xl border border-[#008DFF]/45 bg-[#0E1A40] p-7 md:p-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#EAF54F]">{eyebrow ?? c.expertEyebrowN}</p>
          <h2 className="font-display mb-3 text-3xl font-bold leading-[1.08] text-white md:text-[44px]">{c.expertTitle}</h2>
          <p className="text-[17px] leading-relaxed text-[#C9D6F5]">{c.expertSub}</p>
        </div>
        <div className="lg:col-span-4 lg:flex lg:justify-end">
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 rounded-2xl bg-[#C12909] px-6 py-4 font-semibold text-white hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/social/whatsapp.png" alt="" width={28} height={28} loading="lazy" decoding="async" className="rounded-full" /* REQ-1564 */ />
            {c.expertCta} →
          </a>
        </div>
      </div>
    </section>
  );
}
