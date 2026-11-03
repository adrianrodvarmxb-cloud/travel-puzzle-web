'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { SectionHeading } from './SectionHeading';

// El mapa (y su librería) solo se carga en el navegador.
const WorldMap = dynamic(() => import('@/components/map/WorldMap').then((m) => m.WorldMap), { ssr: false });

export function MapSection() {
  const { language } = useLanguage();
  const c = homeCopy(language);
  return (
    <section id="mapa" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-24 md:px-8 md:pt-28">
      <SectionHeading eyebrow={c.mapEyebrow} title={c.mapHeadline} subtitle={c.mapSub} />
      <WorldMap />
    </section>
  );
}
