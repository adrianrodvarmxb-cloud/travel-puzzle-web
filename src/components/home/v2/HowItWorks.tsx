'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { SectionHeading } from './SectionHeading';

const NUM_COLORS = ['text-[#008DFF]', 'text-[#EAF54F]', 'text-[#E8553A]'];

/** Cómo funciona en 3 pasos. El paso 2 solo promete reservar en línea si las reservas están encendidas. */
export function HowItWorks({ bookingsEnabled }: { bookingsEnabled: boolean }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  return (
    <section id="como-funciona" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-24 md:px-8 md:pt-28">
      <SectionHeading eyebrow={c.howEyebrow} title={c.howHeadline} />
      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
        {c.howSteps(bookingsEnabled).map(([title, text], k) => (
          <li key={title} className="bg-[#0A1330] p-7 md:p-8">
            <p className={`font-data text-4xl ${NUM_COLORS[k]}`}>{String(k + 1).padStart(2, '0')}</p>
            <p className="font-display mb-2 mt-3.5 text-[22px] font-semibold text-white">{title}</p>
            <p className="leading-relaxed text-[#A9B6D6]">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
