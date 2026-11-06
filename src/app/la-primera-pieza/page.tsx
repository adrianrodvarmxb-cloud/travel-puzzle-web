import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DestinationsLayout, Section } from '@/components/destinations/DestinationsLayout';
import { TourGrid } from '@/components/destinations/DestinationTourCard';
import { primeraPiezaPage } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { getDestinations, primeraPiezaOn, siteUrl } from '@/destinations/server';
import { BASE_FREE_NOTICE } from '@/tours/lib/notice';

export const dynamic = 'force-dynamic';

/** Con la bandera apagada no se publica nada (404 igual que cualquier otra). */
export async function generateMetadata(): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    return toMetadata(primeraPiezaPage(await getDestinations(), siteUrl()).meta);
}

/** REQ-088: hub de la colección La Primera Pieza, free tours agrupados por país. Tras PRIMERA_PIEZA_ENABLED. */
export default async function PrimeraPiezaPage() {
    if (!primeraPiezaOn()) notFound();
    const p = primeraPiezaPage(await getDestinations(), siteUrl());
    return (
        <DestinationsLayout eyebrow="Colección de free tours" h1={p.h1} intro={BASE_FREE_NOTICE.es} crumbs={p.crumbs} featured={p.featured} jsonLd={p.jsonLd}>
            {p.groups.length === 0 && <p className="mt-10 text-[#C9D6F5]">Pronto verás aquí los free tours por país. Mientras, <Link href="/tours" className="text-[#7CC4FF] underline">busca tu tour</Link>.</p>}
            {p.groups.map((g) => (
                <Section key={g.href} title={g.country} subtitle={`${g.total} ${g.total === 1 ? 'free tour' : 'free tours'}`}>
                    <TourGrid tours={g.tours} />
                    <Link href={g.href} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#7CC4FF] hover:underline">Ver {g.country} →</Link>
                </Section>
            ))}
        </DestinationsLayout>
    );
}
