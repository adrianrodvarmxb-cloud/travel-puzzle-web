import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { DestinationsLayout } from '@/components/destinations/DestinationsLayout';
import { destinosPage } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { destinosLanguage, getDestinationsIn, primeraPiezaOn, siteUrl } from '@/destinations/server';
import { hubCopy } from '@/destinations/lib/hub-copy';
import { experiencesCount } from '@/tours/lib/catalog-name';
import { formatCount } from '@/home/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    // REQ-660…665 (Gate 3): idioma de la URL con LOCALE_URLS_ENABLED; sin ella, español como hoy.
    const { lang, hreflang } = await destinosLanguage();
    return toMetadata(destinosPage(await getDestinationsIn(lang), siteUrl(), lang).meta, null, { hreflang });
}

/** REQ-088 / REQ-091: hub de los países indexables. Tras PRIMERA_PIEZA_ENABLED. */
export default async function DestinosPage() {
    if (!primeraPiezaOn()) notFound();
    const { lang } = await destinosLanguage();
    const k = hubCopy(lang);
    const p = destinosPage(await getDestinationsIn(lang), siteUrl(), lang);
    return (
        <DestinationsLayout eyebrow={k.destinosEyebrow} h1={p.h1} intro={k.destinosIntro} crumbs={p.crumbs} featured={p.featured} jsonLd={p.jsonLd}>
            {p.countries.length === 0 ? (
                <p className="mt-10 text-[#C9D6F5]">{k.destinosEmpty[0]}<Link href="/tours" className="text-[#7CC4FF] underline">{k.destinosEmpty[1]}</Link>{k.destinosEmpty[2]}</p>
            ) : (
                <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {p.countries.map((c) => (
                        <li key={c.href}>
                            <Link href={c.href} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121D45] px-5 py-4 text-white hover:border-[#008DFF]/60">
                                <span className="font-display text-lg font-semibold">{c.name}</span>
                                <span className="text-right text-xs text-[#A9B6D6]">{k.cityCount(c.cities)} · {experiencesCount(formatCount(c.tours, lang), lang)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </DestinationsLayout>
    );
}
