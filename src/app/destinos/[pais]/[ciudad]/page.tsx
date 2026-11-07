import { ToursByFormat } from '@/components/destinations/ToursByFormat';
import { cityFormatChips, cityIntro, taxonomyLabelsEnabled } from '@/taxonomy/lib/copy';
import { cityFreeIntro, freeSectionTitle } from '@/destinations/lib/pieza-libre-copy';
import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { DestinationsLayout, Section } from '@/components/destinations/DestinationsLayout';
import { TourGrid } from '@/components/destinations/DestinationTourCard';
import { findCity } from '@/destinations/lib/catalog';
import { cityPage, cityTransportCards } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { destinosLanguage, getDestinationsIn, primeraPiezaOn, siteUrl } from '@/destinations/server';
import { hubCopy } from '@/destinations/lib/hub-copy';
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
    const { lang, hreflang } = await destinosLanguage(); // REQ-660…665
    const hit = findCity(await getDestinationsIn(lang), pais, ciudad);
    return hit ? toMetadata(cityPage(hit.country, hit.city, siteUrl(), lang).meta, null, { hreflang }) : {};
}

/**
 * REQ-088…091: la ciudad con Free tours (La Primera Pieza), Tours (incluye viajes propios, gate 4) y Traslados
 * (registro de complementos). Una ciudad sin tours da 404; la que no cumple la regla va con noindex.
 */
export default async function CityPage({ params }: Props) {
    if (!primeraPiezaOn()) notFound();
    const { pais, ciudad } = await params;
    const { lang } = await destinosLanguage();
    const k = hubCopy(lang);
    const hit = findCity(await getDestinationsIn(lang), pais, ciudad);
    if (!hit) notFound();
    const { country, city } = hit;
    const p = cityPage(country, city, siteUrl(), lang);
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
    // REQ-665: las etiquetas por formato (T5) solo existen en español; en otro idioma, las plantillas traducidas.
    const labels = taxonomyLabelsEnabled(env) && lang === 'es';
    const es = lang === 'es';
    return (
        <DestinationsLayout eyebrow={country.name} h1={p.h1} crumbs={p.crumbs} featured={p.featured} jsonLd={p.jsonLd}
            intro={labels ? cityIntro(city.name, city.freeTours.length, tours) : es ? cityFreeIntro(city.name, city.freeTours.length, tours.length) : k.cityFreeIntro(city.name, city.freeTours.length, tours.length)}>
            {city.freeTours.length > 0 && (
                <Section id="free-tours" title={es ? freeSectionTitle() : k.freeSection} subtitle={k.freeSubtitle}>
                    <TourGrid tours={city.freeTours} lang={lang} />
                </Section>
            )}
            {tours.length > 0 && (
                <Section id="tours" title={k.toursSection} subtitle={k.toursSubtitle}>
                    {labels ? <ToursByFormat tours={tours} chips={cityFormatChips(tours)} rates={rates} /> : <TourGrid tours={tours} rates={rates} lang={lang} />}
                </Section>
            )}
            {(transport.length > 0 || city.transportTrips.length > 0) && (
                <Section id="traslados" title={k.transfersSection} subtitle={k.transfersSubtitle}>
                    {city.transportTrips.length > 0 && <TourGrid tours={city.transportTrips} lang={lang} />}
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
                <Section id="guia" title={k.guide(city.name)}>
                    <div className="mt-4 max-w-3xl whitespace-pre-line leading-relaxed text-[#D5DCEE]">{city.guide}</div>
                </Section>
            )}
            <Section id="preguntas" title={k.faqTitle}>
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
