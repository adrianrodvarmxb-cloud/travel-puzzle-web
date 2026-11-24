/**
 * REQ-10870 · Ola 7 (plan §7: «encendido en viajes y Big Bus»): la ficha de un viaje de agencia o de Big Bus con la
 * plantilla única de 21 bloques, montada por las dos rutas (`/viajes/...` y `/destinos/...`) cuando
 * `FICHA_UNICA_TRIP_ENABLED` lo pide (`tripUsesFichaUnica`). Compone, no calcula:
 * - el modelo y las vistas salen de `loadTripFichaPage` (REQ-10870 en `src/ficha/page.ts`) sobre el viaje YA leído por
 *   la ruta (sin segunda consulta); si el modelo no se arma, devuelve null y la ruta pinta `TripDetailView` como hoy;
 * - el JSON-LD es el mismo de hoy (`tripFichaLd`, REQ-576/577/581);
 * - los controles del panel llegan registrados (OCP, INC-020): «request-form» = calendario con precio por día
 *   (REQ-10863, tras TRIP_CALENDAR_ENABLED) + formulario de cotización de hoy; «purchase-box» = caja de Big Bus
 *   (REQ-3423) solo si el viaje tiene ciudad OCTO; sin control registrado, el asesor;
 * - bloque 19 con la franja de transporte de hoy (REQ-10752) y Kiwitaxi (REQ-10753); bloque 20 sin datos todavía
 *   (no sale). Nunca pinta neto ni margen: todo viene del modelo público.
 */
import type React from 'react';
import { headers } from 'next/headers';
import { Navbar } from '@/components/layout';
import { SiteFooter } from '@/components/home/v2';
import { JsonLd } from '@/components/destinations/JsonLd';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { FichaView, type FichaBlockViews } from '@/components/ficha/FichaView';
import { FichaPanel } from '@/components/ficha/FichaPanel';
import { FichaMeetingMap } from '@/components/ficha/blocks/FichaMeetingMap';
import type { BookingControls } from '@/components/ficha/panel/BookingControl';
import { TripRequestForm } from '@/components/trips/TripRequestForm';
import { BigBusBuyBox } from '@/components/trips/BigBusBuyBox';
import { ProviderDateCalendar } from '@/components/tours/one/ProviderDateCalendar';
import { calendarView } from '@/tours/lib/calendar-view';
import { isTripCalendarEnabled, tripCalendar } from '@/trips/lib/trip-calendar'; // REQ-10863
import { bigBusRefForTrip } from '@/octo/lib/public-view';
import { bigBusOctoConfig } from '@/octo/lib/config';
import bigBusCities from '@/octo/data/bigbus-ciudades.json';
import { policySummary, policyText } from '@/trips/lib/cancel-policy';
import { bookingSteps, isCardHoldEnabled } from '@/trips/lib/booking-steps';
import { tripCopy } from '@/trips/lib/copy';
import { localized } from '@/trips/lib/translation';
import { fichaJsonLd } from '@/seo/lib/ficha-ld';
import { tripFichaLd } from '@/trips/ficha-ld';
import { contactFromEnv } from '@/booking/tour-summary';
import { isHelpVisible } from '@/help/lib/faq';
import { getRouteLanguage } from '@/i18n/server';
import { loadTripFichaPage } from '@/ficha/page';
import type { FichaLang } from '@/ficha/lib/model';
import { leerPrefill } from '@/ficha/lib/prefill';
import type { TripData } from '@/components/trips/TripDetailView';
import { transportForPlace } from '@/trips/cross-sell';
import { crossSellDeps } from '@/trips/cross-sell-deps';
import { nearbyUnifiedEnabled } from '@/geo/lib/near';
import { transferCard, transferCardEnabled } from '@/trips/lib/transfer-card';

export type TripQuery = Record<string, string | string[] | undefined>;

/** La ficha con la plantilla única, o null para que la ruta pinte la de hoy. */
// REQ-10870
export async function TripFichaUnica({ data, path, query }: { data: TripData; path: string; query: TripQuery }): Promise<React.ReactElement | null> {
    const { trip, translations: tr, fx } = data;
    const lang = await getRouteLanguage();
    const fichaLang = (['es', 'en', 'pt', 'fr', 'de', 'it'].includes(lang) ? lang : 'es') as FichaLang;
    const env = process.env as Record<string, string | undefined>;
    const h = await headers();
    const c = tripCopy(lang);
    const L = (key: string, es: string) => localized(tr, lang, key, es);
    // REQ-005/006, REQ-10752: la franja de transporte de hoy (misma regla que la ficha de tours); si falla, el bloque no sale.
    const place = { city: trip.cities[0] ?? null, country: trip.countries[0] ?? null };
    const point = trip.meetingPoints.find((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
    const transport = await transportForPlace(place, lang, crossSellDeps(), { unified: nearbyUnifiedEnabled(env), origin: { point: point ? { lat: point.lat as number, lng: point.lng as number } : null, provider: null } })
        .then((items) => items.filter((i) => i.id !== trip.id))
        .catch((e) => { console.error('[viajes] venta cruzada:', (e as Error).message); return []; });
    // REQ-10753: tarjeta de Kiwitaxi (nunca en FREETOUR; aquí el viaje es propio o de agencia).
    const kiwitaxi = transferCard({ cityName: place.city, tourId: trip.id, provider: 'propios', lang, enabled: transferCardEnabled(env) });
    const unica = await loadTripFichaPage(
        { tripBySlug: async () => ({ trip, translations: tr, agencyName: data.agencyName }), env, now: () => new Date(), log: (e) => console.warn(`[ficha] viaje descartado (${e.kind}):`, e.reason) },
        trip.slug, fichaLang,
        { query, reviews: { items: [], total: 0 }, fx, visitorCountry: h.get('cf-ipcountry'), transport, kiwitaxi },
    ).catch((e) => { console.error('[viajes] ficha única:', (e as Error).message); return null; });
    if (!unica) return null;

    // Mismo marcado que la ficha de hoy (REQ-576/577/581).
    const ld = tripFichaLd({ data, path, lang, env });
    // REQ-10863: calendario con precio por día, tras TRIP_CALENDAR_ENABLED; sin un solo día, null (nunca un calendario vacío).
    const calendario = isTripCalendarEnabled(env.TRIP_CALENDAR_ENABLED)
        ? (() => { const cal = tripCalendar({ availability: trip.availability, options: trip.options, currency: trip.currency, minNoticeHours: trip.minNoticeHours }, { today: new Date().toISOString().slice(0, 10), months: 6 }); return cal ? calendarView(cal, lang) : null; })()
        : null;
    // REQ-040 / REQ-059: la política se acepta al enviar y «Cómo funciona tu reserva» solo promete lo que existe (como hoy).
    const policy = policyText(policySummary(trip.cancellation), c);
    const steps = bookingSteps(lang, { cardHold: isCardHoldEnabled(env.STRIPE_HOLD_ENABLED) });
    const cancel = trip.cancellation.type === 'standard' ? [c.cancelStandard] : trip.cancellation.type === 'none' ? [c.cancelNone] : trip.cancellation.tiers.map((t) => c.cancelTier(t.daysBefore, t.refundPct));
    // REQ-10820: lo que la URL trae y es válido para esta ficha (fecha, personas, opción).
    const prellenado = leerPrefill(query, unica.ficha);
    // REQ-3423: compra directa de Big Bus solo con BIGBUS_OCTO_ENABLED y ciudad OCTO; sin ella, el panel cae al asesor (INC-020).
    const bigBusRef = bigBusOctoConfig(env) ? bigBusRefForTrip(trip.id, Object.keys(bigBusCities).filter((k) => !k.startsWith('_'))) : null;
    const controls: BookingControls = {
        'request-form': () => (
            <div className="space-y-5" data-control-viaje="cotizacion">
                {calendario && (
                    <SectionBoundary name="calendario-viaje">
                        <div data-calendario-viaje="true"><ProviderDateCalendar view={calendario} /></div>
                    </SectionBoundary>
                )}
                <TripRequestForm tripId={trip.id} custom={trip.kind === 'personalizado'} currency={trip.currency} lang={lang} returnPath={path}
                    options={trip.options.map((o) => ({ ...o, name: L(`options.${o.id}.name`, o.name) }))} availability={trip.availability}
                    minNoticeHours={trip.minNoticeHours} hotelPickup={trip.hotelPickup} policy={policy}
                    policyItems={cancel} policyTitle={c.cancellation} closeLabel="OK" bookTitle={steps.formTitle} bookNote={steps.formNote} prellenado={prellenado} />
            </div>
        ),
        ...(bigBusRef ? { 'purchase-box': () => <SectionBoundary name="compra-bigbus"><BigBusBuyBox cityRef={bigBusRef} lang={lang === 'en' ? 'en' : 'es'} today={new Date().toISOString().slice(0, 10)} /></SectionBoundary> } : {}),
    };
    // REQ-10860: el mapa del punto de encuentro como children del bloque 11.
    const punto = unica.page.views['punto-de-encuentro'];
    const views: FichaBlockViews = punto
        ? { ...unica.page.views, 'punto-de-encuentro': { ...punto, children: <FichaMeetingMap view={punto.view} label={punto.text.heading} /> } }
        : unica.page.views;
    const contact = contactFromEnv(env);
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <JsonLd data={[fichaJsonLd(ld.ficha)]} />
            <div className="tp-dark pt-8" data-plantilla="unica" data-viaje={trip.code}>
                <FichaView
                    order={unica.page.order}
                    views={views}
                    enrichment={true}
                    panel={<FichaPanel panel={unica.page.panel} lang={unica.ficha.lang} controls={controls} />}
                    panelOnMobile // la ficha de viajes no tiene barra fija de celular: el panel va debajo del contenido, como hoy
                />
            </div>
            <SiteFooter contact={{ whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials }} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
        </div>
    );
}
