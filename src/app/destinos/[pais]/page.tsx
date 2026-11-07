import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { DestinationsLayout } from '@/components/destinations/DestinationsLayout';
import { findCountry } from '@/destinations/lib/catalog';
import { countryPage } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { getDestinations, primeraPiezaOn, siteUrl } from '@/destinations/server';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ pais: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    const country = findCountry(await getDestinations(), (await params).pais);
    return country ? toMetadata(countryPage(country, siteUrl()).meta) : {};
}

/** REQ-088 / REQ-091: el país con sus ciudades (generado desde los datos). Tras PRIMERA_PIEZA_ENABLED. */
export default async function CountryPage({ params }: Props) {
    if (!primeraPiezaOn()) notFound();
    const country = findCountry(await getDestinations(), (await params).pais);
    if (!country) notFound();
    const p = countryPage(country, siteUrl());
    return (
        <DestinationsLayout eyebrow="Destino" h1={p.h1} intro={`Ciudades de ${country.name} con free tours y tours con guías locales.`} crumbs={p.crumbs} featured={p.featured} jsonLd={p.jsonLd}>
            <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {p.cities.map((c) => (
                    <li key={c.href}>
                        <Link href={c.href} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121D45] px-5 py-4 text-white hover:border-[#008DFF]/60">
                            <span className="font-display text-lg font-semibold">{c.name}</span>
                            <span className="text-right text-xs text-[#A9B6D6]">{c.free} free tours · {c.tours} tours</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </DestinationsLayout>
    );
}
