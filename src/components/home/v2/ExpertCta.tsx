'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy, waLink } from '@/home/lib/copy';

export function ExpertCta({ whatsapp }: { whatsapp?: string }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const href = waLink(whatsapp, c.expertWa);
  if (!href) return null;

  return (
    <section className="px-4 py-16">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-[#0A1330] bg-[linear-gradient(160deg,#0A1330_0%,#14214D_55%,#304A9F_100%)] p-8 md:p-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#EAF54F]">05 — {c.expertEyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold text-white md:text-4xl">{c.expertTitle}</h2>
            <p className="mt-3 text-white/80">{c.expertSub}</p>
          </div>
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-3 rounded-xl bg-[#C12909] px-6 py-4 font-semibold text-white hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/social/whatsapp.png" alt="" width={28} height={28} className="rounded-full" />
            {c.expertCta} →
          </a>
        </div>
      </div>
    </section>
  );
}
