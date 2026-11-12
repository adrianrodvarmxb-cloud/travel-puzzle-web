import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { DestinationsLayout, Section } from '@/components/destinations/DestinationsLayout';
import { toMetadata } from '@/destinations/metadata';
import { destinosLanguage, primeraPiezaOn, siteUrl } from '@/destinations/server';
import { guidesIndexFor, loadGuides } from '@/destinations/guias';
import { GUIDES_PATH, guidesLangs, guidesPageCopy, guidesPageMeta } from '@/destinations/lib/guias-index';
import type { GuideLang } from '@/destinations/lib/guia';

export const dynamic = 'force-dynamic';

/** REQ-3334: idioma de la página solo si hay guías en él (es o en); otro idioma, null (404). */
async function pageLang(): Promise<{ lang: GuideLang; hreflang: boolean } | null> {
    const { lang, hreflang } = await destinosLanguage();
    const langs = guidesLangs(loadGuides());
    return (langs as string[]).includes(lang) ? { lang: lang as GuideLang, hreflang } : null;
}

export async function generateMetadata(): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    const l = await pageLang();
    if (!l) return {};
    return toMetadata(guidesPageMeta({ lang: l.lang, siteUrl: siteUrl(), langs: guidesLangs(loadGuides()) }), null, { hreflang: l.hreflang });
}

/** REQ-3334: índice de las guías de ciudad por país (gate A3), en español y en inglés (gate B2). */
export default async function GuiasPage() {
    if (!primeraPiezaOn()) notFound();
    const l = await pageLang();
    if (!l) notFound();
    const index = guidesIndexFor(l.lang);
    if (!index.length) notFound();
    const c = guidesPageCopy(l.lang);
    const crumbs = [{ name: c.home, href: '/' }, { name: c.h1, href: GUIDES_PATH }];
    return (
        <DestinationsLayout eyebrow="Travel Puzzle" h1={c.h1} intro={c.lead} crumbs={crumbs} featured={null} jsonLd={[]}>
            {index.map((country) => (
                <Section key={country.pais} id={country.pais} title={country.name} subtitle={c.count(country.count)}>
                    <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {country.cities.map((city) => (
                            <li key={city.ciudad}>
                                <Link href={city.href} className="flex min-h-16 flex-col justify-center gap-1 rounded-2xl border border-white/10 bg-[#121D45] px-5 py-4 text-white hover:border-[#008DFF]/60">
                                    <span className="font-display text-lg font-semibold">{city.nombre}</span>
                                    <span className="text-sm text-[#A9B6D6]">{city.titulo}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            ))}
        </DestinationsLayout>
    );
}
