import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { TripGallery } from '@/components/trips/TripGallery';
import { TripSection, TripList } from '@/components/trips/TripSection';
import { TripPriceBox } from '@/components/trips/TripPriceBox';
import { TripGuarantees } from '@/components/trips/TripGuarantees';
import { TripMeetingPoints } from '@/components/trips/TripMeetingPoints';
import { TripRequestForm } from '@/components/trips/TripRequestForm';
import { policySummary, policyText } from '@/trips/lib/cancel-policy';
import { loadTripBySlug, toCard } from '@/trips/public-load';
import { tripCopy } from '@/trips/lib/copy';
import { tripPath } from '@/trips/lib/public';
import { countryName } from '@/trips/lib/geo';
import { imageUrl } from '@/trips/lib/image';
import { localized } from '@/trips/lib/translation';
import { priceDisplay, formatMoney } from '@/trips/lib/money';
import { contactFromEnv } from '@/booking/tour-summary';
import { isHelpVisible } from '@/help/lib/faq';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { CrossSellStrip } from '@/components/trips/CrossSellStrip';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { toursForPlace } from '@/trips/cross-sell';
import { crossSellDeps } from '@/trips/cross-sell-deps';
import { crossSellCopy } from '@/trips/lib/cross-sell-copy';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ destino: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const data = await loadTripBySlug(slug);
    if (!data) return {};
    const lang = await getPreferredLanguage();
    const title = localized(data.translations, lang, 'title', data.trip.titleEs);
    const description = localized(data.translations, lang, 'summary', data.trip.summaryEs);
    const path = tripPath(data.trip);
    const image = data.trip.images[0] ? imageUrl(data.trip.images[0].key) : undefined;
    return {
        title: { absolute: `${title} · Travel Puzzle` },
        description,
        alternates: { canonical: path },
        openGraph: { type: 'website', title, description, url: path, ...(image && { images: [{ url: image }] }) },
    };
}

/** Ficha pública de un viaje propio o de agencia (punto 17, ola 2). */
export default async function TripPage({ params }: Props) {
    const { destino, slug } = await params;
    const data = await loadTripBySlug(slug);
    if (!data) notFound();
    const { trip, translations: tr, fx } = data;
    const path = tripPath(trip);
    if (path !== `/viajes/${destino}/${slug}`) permanentRedirect(path);

    const lang = await getPreferredLanguage();
    const c = tripCopy(lang);
    const L = (key: string, es: string) => localized(tr, lang, key, es);
    const card = toCard({ ...trip, translations: tr }, lang, fx);
    const env = process.env as Record<string, string | undefined>;
    const contact = contactFromEnv(env);
    const wa = contact.whatsapp ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hola Travel Puzzle, quiero cotizar "${trip.titleEs}" (${trip.code}).`)}` : null;
    const opt = (n: number | null) => (n === null ? '—' : priceDisplay(n, trip.currency, fx, lang)?.main ?? '—');
    // REQ-007: en la ficha de un transporte, tours de la misma ciudad (o país). Si falla, la ficha sigue.
    const cs = crossSellCopy(lang);
    const tourCity = trip.cities[0] ?? null;
    const relatedTours = trip.kind === 'transporte'
        ? await toursForPlace({ city: tourCity, country: trip.countries[0] ?? null }, lang, crossSellDeps()).catch((e) => { console.error('[venta cruzada]', (e as Error).message); return []; })
        : [];
    // REQ-040: la política de la ficha se ve junto al precio y se acepta al enviar (como Civitatis/GetYourGuide).
    const policySum = policySummary(trip.cancellation);
    const policy = { text: policyText(policySum, c), free: policySum.kind === 'free' };
    const cancel = trip.cancellation.type === 'standard' ? [c.cancelStandard] : trip.cancellation.type === 'none' ? [c.cancelNone] : trip.cancellation.tiers.map((t) => c.cancelTier(t.daysBefore, t.refundPct));

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark">
                <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-10 md:px-8">
                    <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">
                        {c.kinds[trip.kind]} · {trip.countries.map((x) => countryName(x, lang)).join(' · ')}{trip.durationDays ? ` · ${c.days(trip.durationDays)}` : ''}
                    </p>
                    <h1 className="font-display mt-2 text-3xl font-bold leading-tight text-white md:text-5xl">{card.title}</h1>
                    {trip.cities.length > 0 && <p className="mt-2 text-[#C9D6F5]">{trip.cities.join(' · ')}</p>}

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
                            {trip.importantInfo && <TripSection title={c.important}><p className="whitespace-pre-line">{L('importantInfo', trip.importantInfo)}</p></TripSection>}
                            {trip.whatToBring && <TripSection title={c.bring}><p className="whitespace-pre-line">{L('whatToBring', trip.whatToBring)}</p></TripSection>}
                            {trip.accessibility && <TripSection title={c.accessibility}><p className="whitespace-pre-line">{L('accessibility', trip.accessibility)}</p></TripSection>}
                            {trip.visaInfo && <TripSection title={c.visa}><p className="whitespace-pre-line">{L('visaInfo', trip.visaInfo)}</p></TripSection>}
                            <TripSection id="cancelacion" title={c.cancellation}><TripList mark="•" items={cancel} /></TripSection>
                            {trip.videoUrl && (
                                <TripSection title={c.video}>
                                    <a href={trip.videoUrl} target="_blank" rel="noopener" className="text-[#7CC4FF] underline">{trip.videoCaption ? L('videoCaption', trip.videoCaption) : trip.videoUrl}</a>
                                </TripSection>
                            )}
                        </div>
                        <aside className="space-y-5">
                            <TripPriceBox price={card.price} c={c} whatsappUrl={wa} policy={policy} />
                            {relatedTours.length > 0 && (
                                <SectionBoundary name="franja-tours">
                                    <CrossSellStrip eyebrow={cs.toursEyebrow(L('cities.0', tourCity ?? ''))} question={cs.toursQuestion} from={cs.from} freeLabel="Free tour" items={relatedTours.slice(0, 2)} />
                                </SectionBoundary>
                            )}
                            <TripRequestForm tripId={trip.id} custom={trip.kind === 'personalizado'} currency={trip.currency} lang={lang} returnPath={path}
                                options={trip.options.map((o) => ({ ...o, name: L(`options.${o.id}.name`, o.name) }))} availability={trip.availability}
                                minNoticeHours={trip.minNoticeHours} hotelPickup={trip.hotelPickup} policy={policy.text} />
                            <div className="rounded-2xl border border-white/10 bg-[#121D45] p-5 text-sm text-[#D5DCEE]">
                                <ul className="space-y-2">
                                    {trip.languages.length > 0 && <li>🗣️ {c.languages}: {trip.languages.map((l) => new Intl.DisplayNames([lang], { type: 'language' }).of(l)).join(', ')}</li>}
                                    {(trip.minPax || trip.maxPax) && <li>👥 {c.group_size(trip.minPax, trip.maxPax)}</li>}
                                    {trip.difficulty && <li>⛰️ {c.difficulty[trip.difficulty]}</li>}
                                    <li>✈️ {trip.flightsIncluded ? c.flights : c.noFlights}</li>
                                    <li className="font-data text-[11px] uppercase tracking-wider text-[#7F8DB0]">{trip.code}</li>
                                </ul>
                            </div>
                            <TripGuarantees c={c} />
                        </aside>
                    </div>
                </div>
            </main>
            <SiteFooter contact={{ whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials }} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
            <WhatsAppBubble whatsapp={contact.whatsapp} />
        </div>
    );
}
