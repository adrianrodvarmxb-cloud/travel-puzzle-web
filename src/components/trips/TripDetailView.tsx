/**
 * Ficha pública de un viaje propio o de agencia (punto 17, ola 2). Movida tal cual desde
 * app/viajes/[destino]/[slug]/page.tsx para que la use también /destinos/{pais}/{ciudad}/{slug} (gate 4).
 * `path` es la URL canónica de la ficha (la de /viajes hoy, o la de /destinos con PRIMERA_PIEZA_ENABLED).
 */
import { circuitFacts, taxonomyCircuitsEnabled } from '@/taxonomy/lib/circuit-facts';
import { DEFAULT_DICTIONARY } from '@/taxonomy/data';
import type { Metadata } from 'next';
import type React from 'react';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { TripGallery } from '@/components/trips/TripGallery';
import { TripSection, TripList } from '@/components/trips/TripSection';
import { TripPriceBox } from '@/components/trips/TripPriceBox';
import { TripGuarantees } from '@/components/trips/TripGuarantees';
import { guaranteeItems, onlinePaymentsFromEnv } from '@/trips/lib/guarantees';
import { TripMeetingPoints } from '@/components/trips/TripMeetingPoints';
import { TripRequestForm } from '@/components/trips/TripRequestForm';
import { BigBusBuyBox } from '@/components/trips/BigBusBuyBox';
import { bigBusRefForTrip } from '@/octo/lib/public-view';
import { bigBusOctoConfig } from '@/octo/lib/config';
import bigBusCities from '@/octo/data/bigbus-ciudades.json';
import { policySummary, policyText } from '@/trips/lib/cancel-policy';
import { bookingSteps, isCardHoldEnabled } from '@/trips/lib/booking-steps';
import { loadTripBySlug, toCard } from '@/trips/public-load';
import { tripCopy } from '@/trips/lib/copy';
import { durationLabel, isAudioGuided, languagesLabel } from '@/trips/lib/trip-facts';
import { tripPath } from '@/trips/lib/public';
import { countryName } from '@/trips/lib/geo';
import { imageUrl } from '@/trips/lib/image';
import { localized } from '@/trips/lib/translation';
import { priceDisplay, formatMoney, optionPrice } from '@/trips/lib/money';
import { contactFromEnv } from '@/booking/tour-summary';
import { isHelpVisible } from '@/help/lib/faq';
import { getRouteLanguage } from '@/i18n/server';
import { CrossSellStrip } from '@/components/trips/CrossSellStrip';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { toursForPlace } from '@/trips/cross-sell';
import { crossSellDeps } from '@/trips/cross-sell-deps';
import { crossSellCopy } from '@/trips/lib/cross-sell-copy';
import { JsonLd } from '@/components/destinations/JsonLd';
import { TripHeader } from '@/components/trips/TripHeader';
import { enBreve, fichaJsonLd } from '@/seo/lib/ficha-ld';
import { tripFichaInput } from '@/seo/lib/trip-ficha';
import { OWN_PROVIDER } from '@/trips/public-load';
import { canonicalUrl } from '@/seo/lib/hub';
import { SITE_URL_DEFAULT } from '@/destinations/load';

export type TripData = NonNullable<Awaited<ReturnType<typeof loadTripBySlug>>>;

export async function tripMetadata(data: TripData, path: string): Promise<Metadata> {
    const lang = await getRouteLanguage();
    const title = localized(data.translations, lang, 'title', data.trip.titleEs);
    const description = localized(data.translations, lang, 'summary', data.trip.summaryEs);
    const image = data.trip.images[0] ? imageUrl(data.trip.images[0].key) : undefined;
    return {
        title: { absolute: `${title} · Travel Puzzle` },
        description,
        alternates: { canonical: path },
        openGraph: { type: 'website', title, description, url: path, ...(image && { images: [{ url: image }] }) },
    };
}

export async function TripDetailView({ data, path, breadcrumbs, prellenado }: { data: TripData; path: string; breadcrumbs?: React.ReactNode; prellenado?: { fecha?: string; adultos?: number; ninos?: number } }) {
    const { trip, translations: tr, fx } = data;
    const lang = await getRouteLanguage();
    const c = tripCopy(lang);
    const L = (key: string, es: string) => localized(tr, lang, key, es);
    const duration = durationLabel(trip, c);
    const isAudio = isAudioGuided(trip);
    const card = toCard({ ...trip, translations: tr }, lang, fx);
    const env = process.env as Record<string, string | undefined>;
    const facts = taxonomyCircuitsEnabled(env as Record<string, string | undefined>) ? circuitFacts({ kind: trip.kind, difficulty: trip.difficulty, difficultyLevel: trip.difficultyLevel ?? null, durationDays: trip.durationDays, options: trip.options }, DEFAULT_DICTIONARY, lang) : null;
    const contact = contactFromEnv(env);
    const wa = contact.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hola Travel Puzzle, quiero cotizar "${trip.titleEs}" (${trip.code}).`)}` : null;
    // REQ-112: opciones en la moneda original del operador con pesos aproximados (decisión del PO, 5 nov 2026). Reversible: false vuelve a pesos primero.
    const OPTIONS_IN_ORIGINAL = true;
    const opt = (n: number | null) => (n === null ? '—' : OPTIONS_IN_ORIGINAL ? optionPrice(n, trip.currency, fx, lang) : priceDisplay(n, trip.currency, fx, lang)?.main ?? '—');
    // REQ-007: en la ficha de un transporte, tours de la misma ciudad (o país). Si falla, la ficha sigue.
    const cs = crossSellCopy(lang);
    const tourCity = trip.cities[0] ?? null;
    const relatedTours = trip.kind === 'transporte'
        ? await toursForPlace({ city: tourCity, country: trip.countries[0] ?? null }, lang, crossSellDeps()).catch((e) => { console.error('[venta cruzada]', (e as Error).message); return []; })
        : [];
    // REQ-040: la política de la ficha se ve junto al precio y se acepta al enviar (como Civitatis/GetYourGuide).
    const policySum = policySummary(trip.cancellation);
    const policy = { text: policyText(policySum, c), free: policySum.kind === 'free' };
    // REQ-060 (PO, 5 nov 2026): la política no se ve a primera vista; solo desde la casilla de aceptación (y en el contrato).
    const SHOW_POLICY_ON_PAGE = false;
    // REQ-059: "Cómo funciona tu reserva" solo promete lo que existe (retención en tarjeta tras STRIPE_HOLD_ENABLED).
    const steps = bookingSteps(lang, { cardHold: isCardHoldEnabled(env.STRIPE_HOLD_ENABLED) });
    const cancel = trip.cancellation.type === 'standard' ? [c.cancelStandard] : trip.cancellation.type === 'none' ? [c.cancelNone] : trip.cancellation.tiers.map((t) => c.cancelTier(t.daysBefore, t.refundPct));
    // REQ-576/577/581: marcado Product+TouristTrip, «En breve», tipo y etiquetas, con los mismos textos que se ven aquí.
    // Idiomas: los mismos nombres de la lista visible (Intl en el servidor, como hoy). La cancelación no entra mientras
    // REQ-060 la oculte de la página (SHOW_POLICY_ON_PAGE): el marcado y «En breve» solo dicen lo visible.
    const languageNames = trip.languages.map((l) => new Intl.DisplayNames([lang], { type: 'language' }).of(l) ?? l);
    const agencyId = (trip as { agencyId?: string | null }).agencyId ?? null;
    const operator = data.agencyName?.trim() || (agencyId ? null : OWN_PROVIDER);
    // REQ-3423
    const bigBusRef = bigBusOctoConfig(process.env as Record<string, string | undefined>) ? bigBusRefForTrip(trip.id, Object.keys(bigBusCities).filter((k) => !k.startsWith('_'))) : null;
    const ficha = {
        ...tripFichaInput({
            trip: { ...trip, agencyId }, lang, url: canonicalUrl(process.env.SITE_URL || SITE_URL_DEFAULT, path), title: card.title, summary: card.summary || null,
            operator, duration, languageNames, languagesTitle: isAudio ? (lang === 'es' ? 'Audioguía' : 'Audio guide') : null, priceText: card.price ? `${c.from} ${card.price.main}${card.price.original ? ` · ${card.price.original}` : ''}` : null,
            places: [trip.cities.join(', '), trip.countries.map((x) => countryName(x, lang)).join(', ')].filter(Boolean).join(' · ') || null,
            includes: trip.includes.map((x, i) => L(`includes.${i}`, x)), formato: card.formato ?? null,
        }),
        images: trip.images.map((im) => imageUrl(im.key)),
        cancellation: SHOW_POLICY_ON_PAGE ? policy.text : null,
    };
    const breve = enBreve(ficha);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <JsonLd data={[fichaJsonLd(ficha)]} />
            <main className="tp-dark" data-enriquecimiento="true">
                <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-10 md:px-8">
                    {breadcrumbs && <div className="mb-6">{breadcrumbs}</div>}
                    <TripHeader eyebrow={`${c.kinds[trip.kind]} · ${trip.countries.map((x) => countryName(x, lang)).join(' · ')}${duration ? ` · ${duration}` : ''}`} title={card.title} cities={trip.cities} breve={breve} tipo={ficha.tipo} etiquetas={ficha.etiquetas} lang={lang} />

                    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
                        <div className="min-w-0 space-y-8">
                            <TripGallery images={trip.images.map((im) => ({ url: imageUrl(im.key), alt: im.alt }))} title={card.title} />
                            {card.summary && <p className="text-lg text-[#E3E9F7]">{card.summary}</p>}
                            {trip.highlights.length > 0 && (
                                <TripSection title={c.highlights}><TripList mark="✦" items={trip.highlights.map((h, i) => L(`highlights.${i}`, h))} /></TripSection>
                            )}
                            {trip.descriptionEs && <TripSection title={c.description}><p className="whitespace-pre-line">{L('description', trip.descriptionEs)}</p></TripSection>}
                            {trip.itinerary.length > 0 && (
                                <TripSection title={c.itinerary}>
                                    <ol className="space-y-4">
                                        {trip.itinerary.map((d, i) => (
                                            <li key={i} className="border-l-2 border-[#008DFF] pl-4">
                                                <p className="font-semibold text-white">{c.day} {i + 1} · {L(`itinerary.${i}.title`, d.title)}</p>
                                                {d.text && <p className="mt-1 whitespace-pre-line">{L(`itinerary.${i}.text`, d.text)}</p>}
                                            </li>
                                        ))}
                                    </ol>
                                </TripSection>
                            )}
                            {(trip.includes.length > 0 || trip.excludes.length > 0) && (
                                <div className="grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-2">
                                    <div><h2 className="font-display text-xl font-semibold text-white">{c.includes}</h2><div className="mt-3 text-[#D5DCEE]"><TripList mark="✓" items={trip.includes.map((x, i) => L(`includes.${i}`, x))} /></div></div>
                                    <div><h2 className="font-display text-xl font-semibold text-white">{c.excludes}</h2><div className="mt-3 text-[#D5DCEE]"><TripList mark="✕" items={trip.excludes.map((x, i) => L(`excludes.${i}`, x))} /></div></div>
                                </div>
                            )}
                            {trip.options.length > 0 && trip.options.some((o) => o.adult) && (
                                <TripSection title={c.options}>
                                    <div className="space-y-3">
                                        {trip.options.map((o) => (
                                            <div key={o.id} className="rounded-xl border border-white/10 p-4">
                                                <p className="font-semibold text-white">{L(`options.${o.id}.name`, o.name)}{(() => { const m = o.mode === 'private' ? c.private : c.group; return L(`options.${o.id}.name`, o.name).toLowerCase() === m.toLowerCase() ? null : <span className="text-xs text-[#A9B6D6]"> · {m}</span>; })()}</p>
                                                <p className="mt-1 text-sm">{c.adult}: {opt(o.adult)}{o.child !== null ? ` · ${c.child(o.childAgeMin, o.childAgeMax)}: ${opt(o.child)}` : ''}{o.infant !== null ? ` · ${c.infant}: ${opt(o.infant)}` : ''}</p>
                                            </div>
                                        ))}
                                        {trip.extras.length > 0 && (
                                            <p className="text-sm text-[#A9B6D6]">{c.extras}: {trip.extras.map((x, i) => `${L(`extras.${i}.name`, x.name)} (${formatMoney(x.price, trip.currency, lang)})`).join(' · ')}</p>
                                        )}
                                        {trip.priceNote && <p className="text-sm text-[#A9B6D6]">{L('priceNote', trip.priceNote)}</p>}
                                    </div>
                                </TripSection>
                            )}
                            {trip.meetingPoints.length > 0 && (
                                <TripSection title={c.meeting}>
                                    <TripMeetingPoints c={{ hotel: c.hotel, endPoint: c.endPoint, seeMap: c.seeMap }} hotelPickup={trip.hotelPickup} endPoint={trip.endPoint ? L('endPoint', trip.endPoint) : ''}
                                        points={trip.meetingPoints.map((p, i) => ({ ...p, instructions: p.instructions ? L(`meetingPoints.${i}.instructions`, p.instructions) : '', photo: p.photoKey ? imageUrl(p.photoKey) : null }))} />
                                </TripSection>
                            )}
                            {trip.kind !== 'personalizado' && (
                                <TripSection title={steps.title}>
                                    <ol className="list-decimal space-y-2 pl-5">{steps.steps.map((x) => <li key={x}>{x}</li>)}</ol>
                                </TripSection>
                            )}
                            {trip.importantInfo && <TripSection title={c.important}><p className="whitespace-pre-line">{L('importantInfo', trip.importantInfo)}</p></TripSection>}
                            {trip.whatToBring && <TripSection title={c.bring}><p className="whitespace-pre-line">{L('whatToBring', trip.whatToBring)}</p></TripSection>}
                            {trip.accessibility && <TripSection title={c.accessibility}><p className="whitespace-pre-line">{L('accessibility', trip.accessibility)}</p></TripSection>}
                            {trip.visaInfo && <TripSection title={c.visa}><p className="whitespace-pre-line">{L('visaInfo', trip.visaInfo)}</p></TripSection>}
                            {SHOW_POLICY_ON_PAGE && <TripSection id="cancelacion" title={c.cancellation}><TripList mark="•" items={cancel} /></TripSection>}
                            {trip.videoUrl && (
                                <TripSection title={c.video}>
                                    <a href={trip.videoUrl} target="_blank" rel="noopener" className="text-[#7CC4FF] underline">{trip.videoCaption ? L('videoCaption', trip.videoCaption) : trip.videoUrl}</a>
                                </TripSection>
                            )}
                        </div>
                        <aside className="space-y-5">
                            <TripPriceBox price={card.price} c={c} whatsappUrl={wa} policy={SHOW_POLICY_ON_PAGE ? policy : undefined} />
                            {relatedTours.length > 0 && (
                                <SectionBoundary name="franja-tours">
                                    <CrossSellStrip eyebrow={cs.toursEyebrow(L('cities.0', tourCity ?? ''))} question={cs.toursQuestion} from={cs.from} freeLabel="Free tour" items={relatedTours.slice(0, 2)} />
                                </SectionBoundary>
                            )}
                            {/* REQ-3423: compra directa de Big Bus (solo con BIGBUS_OCTO_ENABLED; si la API no responde, no pinta nada). */}
                            {bigBusRef && (
                                <SectionBoundary name="compra-bigbus">
                                    <BigBusBuyBox cityRef={bigBusRef} lang={lang === 'en' ? 'en' : 'es'} today={new Date().toISOString().slice(0, 10)} />
                                </SectionBoundary>
                            )}
                            <TripRequestForm tripId={trip.id} custom={trip.kind === 'personalizado'} currency={trip.currency} lang={lang} returnPath={path}
                                options={trip.options.map((o) => ({ ...o, name: L(`options.${o.id}.name`, o.name) }))} availability={trip.availability}
                                minNoticeHours={trip.minNoticeHours} hotelPickup={trip.hotelPickup} policy={policy.text}
                                policyItems={cancel} policyTitle={c.cancellation} closeLabel="OK" bookTitle={steps.formTitle} bookNote={steps.formNote} prellenado={prellenado} />
                            <div className="rounded-2xl border border-white/10 bg-[#121D45] p-5 text-sm text-[#D5DCEE]">
                                <ul className="space-y-2">
                                    {trip.languages.length > 0 && <li>{/* REQ-146 */}{isAudio ? '🎧' : '🗣️'} {languagesLabel(trip, c)}{isAudio ? ' ' : ': '}{languageNames.join(', ')}</li>}
                                    {(trip.minPax || trip.maxPax) && <li>👥 {c.group_size(trip.minPax, trip.maxPax)}</li>}
                                    {/* T6b (REQ-421…423, REQ-1520): con TAXONOMY_CIRCUITS_ENABLED, dificultad 1–5 revisada, tipo de grupo y rango de días; apagada, la línea de hoy. */}
                                    {facts ? (
                                        <>
                                            {facts.dificultad && <li data-faceta="dificultad">⛰️ {facts.dificultad}</li>}
                                            {facts.grupo && <li data-faceta="grupo">🧭 {facts.grupo}</li>}
                                            {facts.dias && <li data-faceta="dias">🗓️ {facts.dias}</li>}
                                        </>
                                    ) : trip.difficulty && <li>⛰️ {c.difficulty[trip.difficulty]}</li>}
                                    <li>✈️ {trip.flightsIncluded ? c.flights : c.noFlights}</li>
                                    <li className="font-data text-[11px] uppercase tracking-wider text-[#7F8DB0]">{trip.code}</li>
                                </ul>
                            </div>
                            <TripGuarantees c={c} items={guaranteeItems(trip, { onlinePayments: onlinePaymentsFromEnv(env) }, c)} />
                        </aside>
                    </div>
                </div>
            </main>
            <SiteFooter contact={{ whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials }} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
            <WhatsAppBubble whatsapp={contact.whatsapp} revealAfter={600} />
        </div>
    );
}
