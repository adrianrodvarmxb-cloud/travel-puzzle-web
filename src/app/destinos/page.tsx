import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DestinationsLayout } from '@/components/destinations/DestinationsLayout';
import { destinosPage } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { getDestinations, primeraPiezaOn, siteUrl } from '@/destinations/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    return toMetadata(destinosPage(await getDestinations(), siteUrl()).meta);
}

/** REQ-088 / REQ-091: hub de los países indexables. Tras PRIMERA_PIEZA_ENABLED. */
export default async function DestinosPage() {
    if (!primeraPiezaOn()) notFound();
    const p = destinosPage(await getDestinations(), siteUrl());
    return (
        <DestinationsLayout eyebrow="Destinos" h1={p.h1} intro="Elige tu país y tu ciudad: free tours, tours y traslados con guías locales." crumbs={p.crumbs} featured={p.featured} jsonLd={p.jsonLd}>
            {p.countries.length === 0 ? (
                <p className="mt-10 text-[#C9D6F5]">Pronto verás aquí los destinos. Mientras, <Link href="/tours" className="text-[#7CC4FF] underline">busca tu tour</Link>.</p>
            ) : (
                <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {p.countries.map((c) => (
                        <li key={c.href}>
                            <Link href={c.href} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121D45] px-5 py-4 text-white hover:border-[#008DFF]/60">
                                <span className="font-display text-lg font-semibold">{c.name}</span>
                                <span className="text-right text-xs text-[#A9B6D6]">{c.cities} {c.cities === 1 ? 'ciudad' : 'ciudades'} · {c.tours} tours</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </DestinationsLayout>
    );
}
