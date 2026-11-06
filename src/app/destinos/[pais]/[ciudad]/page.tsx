import { ToursByFormat } from '@/components/destinations/ToursByFormat';
import { cityFormatChips, cityIntro, taxonomyLabelsEnabled } from '@/taxonomy/lib/copy';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DestinationsLayout, Section } from '@/components/destinations/DestinationsLayout';
import { TourGrid } from '@/components/destinations/DestinationTourCard';
import { findCity } from '@/destinations/lib/catalog';
import { cityPage, cityTransportCards } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { getDestinations, primeraPiezaOn, siteUrl } from '@/destinations/server';
import { DEFAULT_REGISTRY, hubModel } from '@/companions/lib/registry';
import { contactFromEnv } from '@/booking/tour-summary';
import { trasladosMode } from '@/transfers/lib/page-mode';
import { PRIMERA_PIEZA_LABEL } from '@/tours/lib/menu';
import { providerCities, type TripCitiesDb } from '@/companions/load';
import { getPrisma } from '@/lib/prisma';
import { loadFx } from '@/trips/public-load';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ pais: string; ciudad: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    const { pais, ciudad } = await params;
    const hit = findCity(await getDestinations(), pais, ciudad);
    return hit ? toMetadata(cityPage(hit.country, hit.city, siteUrl()).meta) : {};
}

/**
 * REQ-088…091: la ciudad con Free tours (La Primera Pieza), Tours (incluye viajes propios, gate 4) y Traslados
 * (registro de complementos). Una ciudad sin tours da 404; la que no cumple la regla va con noindex.
 */
export default async function CityPage({ params }: Props) {
    if (!primeraPiezaOn()) notFound();
    const { pais, ciudad } = await params;
    const hit = findCity(await getDestinations(), pais, ciudad);
    if (!hit) notFound();
    const { country, city } = hit;
    const p = cityPage(country, city, siteUrl());
    const env = process.env as Record<string, string | undefined>;
    // Solo lo que tiene forma real de pedirse en esta ciudad; con Traslados apagado, el traslado general no sale.
    // REQ-121: ciudades de los complementos en modo solicitud (Big Bus…) desde el gestor de viajes; si falla, lista vacía.
    const db: TripCitiesDb = { trip: { findMany: (args) => (getPrisma() as unknown as TripCitiesDb).trip.findMany(args) } };
    const requestCities = await Promise.all(DEFAULT_REGISTRY.filter((e) => e.adapter === 'request').map(async (e) => [e.id, await providerCities(db, e.provider)] as const));
    const groups = hubModel(DEFAULT_REGISTRY, { whatsapp: contactFromEnv(env).whatsapp, citiesByEntry: Object.fromEntries(requestCities) });
    const transport = cityTransportCards(groups, city.name, trasladosMode(env) !== 'hidden');
    // REQ-172: el transporte (Big Bus…) no es un tour: city.ownTrips ya no lo trae; va en Traslados.
    const tours = [...city.paidTours, ...city.ownTrips];
    // REQ-170: tipo de cambio para el «aprox. MXN» de las tarjetas de pago; si falla, solo EUR.
    const rates = city.paidTours.length ? await loadFx().catch(() => null) : null;
    // T5 (REQ-414, REQ-416): chips de formato e intro sin prometer «guías locales» a lo autoguiado, tras TAXONOMY_LABELS_ENABLED.
    const labels = taxonomyLabelsEnabled(env);
    return (
        <DestinationsLayout eyebrow={country.name} h1={p.h1} crumbs={p.crumbs} featured={p.featured} jsonLd={p.jsonLd}
            intro={labels ? cityIntro(city.name, city.freeTours.length, tours) : `${city.freeTours.length} free tours y ${tours.length} tours con guías locales en ${city.name}.`}>
            {city.freeTours.length > 0 && (
                <Section id="free-tours" title={`Free tours (${PRIMERA_PIEZA_LABEL})`} subtitle="Reservar es gratis; al final le das al guía lo que consideres justo.">
                    <TourGrid tours={city.freeTours} />
                </Section>
            )}
            {tours.length > 0 && (
                <Section id="tours" title="Tours" subtitle="Tours con precio y viajes de Travel Puzzle.">
                    {labels ? <ToursByFormat tours={tours} chips={cityFormatChips(tours)} rates={rates} /> : <TourGrid tours={tours} rates={rates} />}
                </Section>
            )}
            {(transport.length > 0 || city.transportTrips.length > 0) && (
                <Section id="traslados" title="Traslados" subtitle="Cada tarjeta dice quién lo cobra.">
                    {city.transportTrips.length > 0 && <TourGrid tours={city.transportTrips} />}
                    {transport.length > 0 && <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {transport.map((c) => (
                            <li key={c.id} className="flex flex-col rounded-2xl border border-white/10 bg-[#121D45] p-5 text-white">
                                <p className="font-display text-lg font-semibold">{c.title}</p>
                                <p className="mt-1 text-sm text-[#C9D6F5]">{c.description}</p>
                                <p className="mt-3 text-xs text-[#A9B6D6]">{c.chargedByLabel}{c.price ? ` · ${c.price}` : ''}</p>
                                {c.external ? (
                                    <a href={c.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 w-fit items-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white hover:bg-sky-400">{c.label}</a>
                                ) : (
                                    <Link href={c.href} className="mt-4 inline-flex min-h-11 w-fit items-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white hover:bg-sky-400">{c.label}</Link>
                                )}
                            </li>
                        ))}
                    </ul>}
                </Section>
            )}
            {city.guide && (
                <Section id="guia" title={`Guía de ${city.name}`}>
                    <div className="mt-4 max-w-3xl whitespace-pre-line leading-relaxed text-[#D5DCEE]">{city.guide}</div>
                </Section>
            )}
            <Section id="preguntas" title="Preguntas frecuentes">
                <dl className="mt-4 max-w-3xl space-y-5">
                    {p.faq.map((f) => (
                        <div key={f.q}>
                            <dt className="font-semibold text-white">{f.q}</dt>
                            <dd className="mt-1 text-[#C9D6F5]">{f.a}</dd>
                        </div>
                    ))}
                </dl>
            </Section>
        </DestinationsLayout>
    );
}
