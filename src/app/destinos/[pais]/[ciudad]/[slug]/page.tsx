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
import { getPreferredLanguage } from '@/lib/utils/cookies';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ pais: string; ciudad: string; slug: string }> };

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
    return toMetadata(tourPage({ country: r.country, city: r.city, tour: r.tour, siteUrl: siteUrl(), lang: 'es' }).meta, r.tour.image);
}

/**
 * REQ-088 / REQ-094…098 / REQ-100: ficha bajo /destinos. Reutiliza la ficha de /tours/[id] (TourDetailClient):
 * H1 = título real, insignia fuera de la foto, aviso por evento y «Operado por un guía local · {proveedor}».
 * Los viajes propios (gate 4) usan su ficha de siempre con URL canónica aquí. Un tour removed lo responde
 * el middleware con 410 antes de llegar aquí.
 */
export default async function DestinationTourPage({ params }: Props) {
    if (!primeraPiezaOn()) notFound();
    const r = await resolve(params);
    if (!r) notFound();
    const { country, city, tour } = r;
    const model = tourPage({ country, city, tour, siteUrl: siteUrl(), lang: 'es' });

    if (tour.kind === 'own') {
        const data = await loadTripBySlug((await params).slug);
        if (!data) notFound();
        return (
            <>
                <JsonLd data={model.jsonLd.slice(1)} />
                <TripDetailView data={data} path={tour.href} breadcrumbs={<Breadcrumbs items={model.crumbs} />} />
            </>
        );
    }

    try {
        const language = await getPreferredLanguage();
        const [props, rates] = await Promise.all([loadTourDetailProps(tour.id, language), loadFx().catch(() => null)]);
        if (!props) notFound();
        return (
            <>
                <JsonLd data={model.jsonLd} />
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
