import { taxonomyLabelsEnabled } from '@/taxonomy/lib/copy';
import type { Metadata } from 'next';
import { notFound, unstable_rethrow } from 'next/navigation';
import { TourDetailClient } from '@/components/tours/one';
import { Breadcrumbs } from '@/components/destinations/Breadcrumbs';
import { JsonLd } from '@/components/destinations/JsonLd';
import { TripDetailView, tripMetadata } from '@/components/trips/TripDetailView';
import { allTours, findCity, type CityNode, type CountryNode } from '@/destinations/lib/catalog';
import { tourPage } from '@/destinations/lib/page-model';
import { toMetadata } from '@/destinations/metadata';
import { getDestinations, primeraPiezaOn, siteUrl } from '@/destinations/server';
import { loadTourDetailProps } from '@/tours/detail-props';
import { isTravelerFavorite } from '@/tours/lib/favorite';
import { tourPriceLabel } from '@/tours/lib/price-label';
import { loadTripBySlug, loadFx } from '@/trips/public-load';
import { getRouteLanguage } from '@/i18n/server';
import { leerPrellenado } from '@/agente/lib/catalogo';
import { guideLanguagesLabel } from '@/seo/lib/ficha-ld';
import { filtersCopy } from '@/tours/lib/filters-copy';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ pais: string; ciudad: string; slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

/** El tour (o viaje propio) de esta ciudad con ese slug. Un tour de FREETOUR gana si un viaje propio usa el mismo slug. */
async function resolve(params: Props['params']): Promise<{ country: CountryNode; city: CityNode; tour: ReturnType<typeof allTours>[number] } | null> {
    const { pais, ciudad, slug } = await params;
    const hit = findCity(await getDestinations(), pais, ciudad);
    if (!hit) return null;
    const href = `/destinos/${pais}/${ciudad}/${slug}`;
    const tour = allTours(hit.city).find((t) => t.href === href);
    return tour ? { ...hit, tour } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    if (!primeraPiezaOn()) return {};
    const r = await resolve(params);
    if (!r) return {};
    if (r.tour.kind === 'own') {
        const data = await loadTripBySlug((await params).slug);
        return data ? { ...(await tripMetadata(data, r.tour.href)), ...(r.city.indexed && r.country.indexable ? {} : { robots: { index: false, follow: true } }) } : {};
    }
    // T5 (G-T9, REQ-416): title y descripción por formato con TAXONOMY_LABELS_ENABLED.
    return toMetadata(tourPage({ country: r.country, city: r.city, tour: r.tour, siteUrl: siteUrl(), lang: 'es', labels: taxonomyLabelsEnabled(process.env as Record<string, string | undefined>) }).meta, r.tour.image);
}

/**
 * REQ-088 / REQ-094…098 / REQ-100: ficha bajo /destinos. Reutiliza la ficha de /tours/[id] (TourDetailClient):
 * H1 = título real, insignia fuera de la foto, aviso por evento y «Operado por un guía local · {proveedor}».
 * Los viajes propios (gate 4) usan su ficha de siempre con URL canónica aquí. Un tour removed lo responde
 * el middleware con 410 antes de llegar aquí.
 */
export default async function DestinationTourPage({ params, searchParams }: Props) {
    if (!primeraPiezaOn()) notFound();
    const r = await resolve(params);
    if (!r) notFound();
    const { country, city, tour } = r;
    // T5 (REQ-415, REQ-416, G-T9): etiqueta de formato y copy por formato, tras TAXONOMY_LABELS_ENABLED.
    const labels = taxonomyLabelsEnabled(process.env as Record<string, string | undefined>);
    const model = tourPage({ country, city, tour, siteUrl: siteUrl(), lang: 'es', labels });

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
            country, city, tour, siteUrl: siteUrl(), lang: 'es', labels, today: new Date().toISOString().slice(0, 10),
            detail: { providerId: row?.providerId, guideLanguages: row?.guideLanguages, departureDates: row?.departureDates, departuresSyncedAt: row?.departuresSyncedAt ?? null, categoryId: row?.categoryId, durationMinutes: row?.durationMinutes ?? null, images: props.initialTour?.images ?? null, /* REQ-820 */
                meetingPoint: mp ? { title: mp.title, lat: Number.isFinite(lat) && Number.isFinite(lng) ? lat : null, lng: Number.isFinite(lat) && Number.isFinite(lng) ? lng : null } : null },
        });
        // REQ-578: el idioma del guía en el idioma de la página, calculado aquí (sin Intl en el cliente, INC-001).
        // REQ-588: con enriquecimiento, del servidor; en FREETOUR se pinta en el cliente (como antes del #204), con data-nosnippet.
        const guide = full.facts.guideLanguages ? guideLanguagesLabel(row?.guideLanguages, language) : [];
        const guideClientOnly = !full.enrichment ? { label: filtersCopy(language).language, codes: row?.guideLanguages ?? null } : null;
        return (
            <>
                <JsonLd data={full.jsonLd} />
                <TourDetailClient
                    {...props}
                    priceLabel={props.initialTour ? tourPriceLabel(props.initialTour.price, props.initialTour.currency, rates, language) : null}
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
            </>
        );
    } catch (error) {
        // INC-003 (regla 7): un fallo de la base no es "no existe"; va al aviso con Reintentar.
        unstable_rethrow(error);
        console.error('[destinos] ficha:', error);
        throw error;
    }
}
