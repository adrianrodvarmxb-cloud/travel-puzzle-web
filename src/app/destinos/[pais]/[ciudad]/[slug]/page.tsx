import { taxonomyLabelsEnabled } from '@/taxonomy/lib/copy';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import { TourDetailClient } from '@/components/tours/one';
import { SiteFooter } from '@/components/home/v2';
import { siteFooterFromEnv } from '@/layout/lib/site-footer';
import { Breadcrumbs } from '@/components/destinations/Breadcrumbs';
import { JsonLd } from '@/components/destinations/JsonLd';
import { TripDetailView, tripMetadata } from '@/components/trips/TripDetailView';
import { allTours, fichaTours, findCity, type CityNode, type CountryNode } from '@/destinations/lib/catalog';
import { tourPage } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { destinosLanguage, getDestinationsIn, primeraPiezaOn, siteUrl } from '@/destinations/server';
import type { SupportedLanguage } from '@/types';
import { loadTourDetailProps } from '@/tours/detail-props';
import { isTravelerFavorite } from '@/tours/lib/favorite';
import { tourPriceLabel } from '@/tours/lib/price-label';
import { loadTripBySlug, loadFx } from '@/trips/public-load';
import { getRouteLanguage } from '@/i18n/server';
import { leerPrellenado } from '@/agente/lib/catalogo';
import { guideLanguagesLabel } from '@/seo/lib/ficha-ld';
import { filtersCopy } from '@/tours/lib/filters-copy';
import { loadProviderAvailability } from '@/tours/availability';
import { availabilityDeps } from '@/tours/availability-deps';
import { isProviderCalendarEnabled } from '@/tours/lib/provider-availability';
import { calendarView } from '@/tours/lib/calendar-view';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ pais: string; ciudad: string; slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

/** El tour (o viaje propio) de esta ciudad con ese slug. Un tour de FREETOUR gana si un viaje propio usa el mismo slug. */
// REQ-665: el árbol en el idioma de la página (mismos slugs y href en todos los idiomas).
async function resolve(params: Props['params'], lang: SupportedLanguage): Promise<{ country: CountryNode; city: CityNode; tour: ReturnType<typeof allTours>[number] } | null> {
    const { pais, ciudad, slug } = await params;
    const hit = findCity(await getDestinationsIn(lang), pais, ciudad);
    if (!hit) return null;
    const href = `/destinos/${pais}/${ciudad}/${slug}`;
    const tour = fichaTours(hit.city).find((t) => t.href === href); // REQ-1262: también las experiencias en línea
    if (tour) return { ...hit, tour };
    // REQ-1349: el viaje se lista aquí pero su URL canónica es la de su ciudad de inicio. Si el middleware no decidió
    // (D1 lenta, bandera), la ficha también manda ahí con 301; nunca se pinta una copia en otra URL.
    const canonical = hit.city.ownTrips.find((t) => t.href.endsWith(`/${slug}`));
    if (canonical) {
        const { hreflang } = await destinosLanguage();
        permanentRedirect(hreflang && lang !== 'es' ? `/${lang}${canonical.href}` : canonical.href);
    }
    return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    // REQ-667 (Gate 3): tourPage recibe el idioma de la URL (con la bandera apagada, español como hoy).
    const { lang, hreflang } = await destinosLanguage();
    const r = await resolve(params, lang);
    if (!r) return {};
    const meta = tourPage({ country: r.country, city: r.city, tour: r.tour, siteUrl: siteUrl(), lang, labels: taxonomyLabelsEnabled(process.env as Record<string, string | undefined>) }).meta;
    if (r.tour.kind === 'own') {
        const data = await loadTripBySlug((await params).slug);
        if (!data) return {};
        const base = await tripMetadata(data, r.tour.href);
        // REQ-660…662: canonical del idioma y hreflang solo con la bandera; sin ella, como antes.
        if (!hreflang) return { ...base, ...(r.city.indexed && r.country.indexable ? {} : { robots: { index: false, follow: true } }) };
        const m = toMetadata(meta, null, { hreflang });
        return { ...base, alternates: m.alternates, openGraph: { ...base.openGraph, url: meta.canonical, locale: m.openGraph?.locale }, ...(meta.index ? {} : { robots: { index: false, follow: true } }) };
    }
    // T5 (G-T9, REQ-416): title y descripción por formato con TAXONOMY_LABELS_ENABLED.
    return toMetadata(meta, r.tour.image, { hreflang });
}

/**
 * REQ-088 / REQ-094…098 / REQ-100: ficha bajo /destinos. Reutiliza la ficha de /tours/[id] (TourDetailClient):
 * H1 = título real, insignia fuera de la foto, aviso por evento y «Operado por un guía local · {proveedor}».
 * Los viajes propios (gate 4) usan su ficha de siempre con URL canónica aquí. Un tour removed lo responde
 * el middleware con 410 antes de llegar aquí.
 */
export default async function DestinationTourPage({ params, searchParams }: Props) {
    if (!primeraPiezaOn()) notFound();
    const { lang } = await destinosLanguage();
    const r = await resolve(params, lang);
    if (!r) notFound();
    const { country, city, tour } = r;
    // T5 (REQ-415, REQ-416, G-T9): etiqueta de formato y copy por formato, tras TAXONOMY_LABELS_ENABLED.
    const labels = taxonomyLabelsEnabled(process.env as Record<string, string | undefined>);
    const model = tourPage({ country, city, tour, siteUrl: siteUrl(), lang, labels }); // REQ-667

    if (tour.kind === 'own') {
        const data = await loadTripBySlug((await params).slug);
        if (!data) notFound();
        return (
            <>
                {/* REQ-576: el nodo Product+TouristTrip del viaje lo pinta TripDetailView (también en /viajes); aquí van las migas. */}
                <JsonLd data={model.jsonLd.slice(1)} />
                <TripDetailView data={data} path={tour.href} breadcrumbs={<Breadcrumbs items={model.crumbs} />} prellenado={leerPrellenado((await searchParams) ?? {})} /* REQ-150 */ />
            </>
        );
    }

    try {
        const language = await getRouteLanguage();
        const [props, rates] = await Promise.all([loadTourDetailProps(tour.id, language), loadFx().catch(() => null)]);
        if (!props) notFound();
        // REQ-571…578: el marcado y los datos clave usan la fila del tour (moneda, proveedor, idiomas, salidas, punto de encuentro).
        const row = props.initialTourData as unknown as { providerId?: string; guideLanguages?: unknown; departureDates?: unknown; departuresSyncedAt?: Date | string | null; categoryId?: number; durationMinutes?: number | null } | null;
        const mp = props.initialTour?.meetingPoint as { title?: string; coordinates?: string } | undefined;
        const [lat, lng] = (mp?.coordinates ?? '').split(',').map((x) => Number(x.trim()));
        const full = tourPage({
            country, city, tour, siteUrl: siteUrl(), lang, labels, today: new Date().toISOString().slice(0, 10),
            detail: { providerId: row?.providerId, guideLanguages: row?.guideLanguages, departureDates: row?.departureDates, departuresSyncedAt: row?.departuresSyncedAt ?? null, categoryId: row?.categoryId, durationMinutes: row?.durationMinutes ?? null, images: props.initialTour?.images ?? null, /* REQ-820 */
                meetingPoint: mp ? { title: mp.title, lat: Number.isFinite(lat) && Number.isFinite(lng) ? lat : null, lng: Number.isFinite(lat) && Number.isFinite(lng) ? lng : null } : null },
        });
        // REQ-578: el idioma del guía en el idioma de la página, calculado aquí (sin Intl en el cliente, INC-001).
        // REQ-588: con enriquecimiento, del servidor; en FREETOUR se pinta en el cliente (como antes del #204), con data-nosnippet.
        const guide = full.facts.guideLanguages ? guideLanguagesLabel(row?.guideLanguages, language) : [];
        const guideClientOnly = !full.enrichment ? { label: filtersCopy(language).language, codes: row?.guideLanguages ?? null } : null;
        // REQ-3468…REQ-3471: fechas y precios por día del proveedor, tras PROVIDER_CALENDAR_ENABLED.
        // Si la bandera está apagada, si el proveedor no da tarifas o si la llamada falla, queda en null y
        // la ficha se ve como hoy, con su precio «desde» (nunca un calendario vacío ni un precio inventado).
        const env = process.env as Record<string, string | undefined>;
        const calendario = isProviderCalendarEnabled(env.PROVIDER_CALENDAR_ENABLED)
            ? await loadProviderAvailability(
                {
                    providerId: row?.providerId ?? 'freetour',
                    externalId: Number((props.initialTourData as unknown as { externalId?: number } | null)?.externalId ?? 0),
                    departureDates: row?.departureDates,
                    fromPrice: props.initialTour ? { adult: props.initialTour.price, currency: props.initialTour.currency } : null,
                },
                { months: 6 },
                availabilityDeps(env, new Date().toISOString().slice(0, 10)),
            ).catch((e) => { console.error('[destinos] disponibilidad:', (e as Error).message); return null; })
            : null;
        return (
            <>
                <JsonLd data={full.jsonLd} />
                <TourDetailClient
                    {...props}
                    priceLabel={props.initialTour ? tourPriceLabel(props.initialTour.price, props.initialTour.currency, rates, language) : null}
                    providerCalendar={calendario ? calendarView(calendario, language) : null}
                    primeraPieza={{
                        crumbs: model.crumbs,
                        badge: model.badge,
                        notice: model.notice,
                        operatedBy: model.operatedBy,
                        isFreeTour: tour.isFreeTour,
                        favorite: isTravelerFavorite({ rating: tour.rating, reviews: tour.reviews }),
                        rates,
                        labels: model.labels,
                        facts: { duration: full.facts.duration, extra: guide.length ? [{ label: filtersCopy(language).language, value: guide.join(', ') }] : [], clientOnly: guideClientOnly },
                        enrichment: full.enrichment,
                        enBreve: full.enBreve,
                        facets: full.facets,
                    }}
                />
                {/* REQ-1101 (D07): el mismo pie del home que el resto del sitio (la ficha de viaje ya lo trae en TripDetailView). */}
                <SiteFooter {...siteFooterFromEnv(process.env as Record<string, string | undefined>)} />
            </>
        );
    } catch (error) {
        // INC-003 (regla 7): un fallo de la base no es "no existe"; va al aviso con Reintentar.
        unstable_rethrow(error);
        console.error('[destinos] ficha:', error);
        throw error;
    }
}
