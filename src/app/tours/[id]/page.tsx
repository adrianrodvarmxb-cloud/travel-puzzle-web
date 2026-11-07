import { notFound, unstable_rethrow } from 'next/navigation';
import { TourDetailClient } from '@/components/tours/one';
import { fetchTourById } from '@/actions/tours';
import { getRouteLanguage } from '@/i18n/server';
import { transformDBTourToUITour } from '@/lib/db/tour-transformer';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';
import type { Metadata } from 'next';
import { tourMeta } from '@/seo/lib/meta';
import { loadTourDetailProps } from '@/tours/detail-props';
import { getDestinations, primeraPiezaOn } from '@/destinations/server';
import { legacyTourCanonical } from '@/seo/lib/legacy-canonical';
import { providerRobots } from '@/seo/lib/enrichment';
import { tourPriceLabel } from '@/tours/lib/price-label';
import { loadFx } from '@/trips/public-load';

interface TourDetailPageProps {
    params: Promise<{ id: string }>;
}

/** Vista previa al compartir el tour: su foto, título con ★ y reseñas, y su descripción corta. */
export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const language = await getRouteLanguage();
    try {
        const data = await fetchTourById(id, language);
        if (!data) return {};
        const tour = transformDBTourToUITour(data as unknown as TourWithRelations, language);
        const m = tourMeta({ title: tour.title, brief: tour.brief, rating: tour.rating, reviews: tour.reviewsNumber, image: tour.titleImageURL ?? tour.images[0] ?? null }, language);
        // REQ-579: con PRIMERA_PIEZA_ENABLED esta URL redirige (301) a su ficha de /destinos; el canonical es ese destino final.
        const canonical = primeraPiezaOn() ? legacyTourCanonical(await getDestinations().catch(() => null), id) : `/tours/${id}`;
        // REQ-831: «noindex hasta su permiso» también en la URL vieja (cuando no redirige a /destinos).
        const robots = providerRobots((data as { providerId?: string | null }).providerId || 'freetour');
        return {
            title: { absolute: m.title },
            description: m.description,
            alternates: { canonical },
            ...(robots ? { robots } : {}),
            openGraph: { type: 'website', title: m.title, description: m.description, url: canonical, images: [{ url: m.image }] },
            twitter: { card: 'summary_large_image', title: m.title, description: m.description, images: [m.image] },
        };
    } catch {
        return {};
    }
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
    // Get language from cookies, default to 'en'
    const language = await getRouteLanguage();

    // Get tour ID from params
    const { id } = await params;
    const tourId = id;

    if (!tourId) {
        notFound();
    }

    try {
        // La carga vive en src/tours/detail-props.ts (la comparte la ficha de /destinos).
        const props = await loadTourDetailProps(tourId, language);
        if (!props) {
            notFound();
        }
        // REQ-170: con PRIMERA_PIEZA_ENABLED, EUR con MXN aproximado (calculado aquí, idioma fijo; INC-001).
        const rates = primeraPiezaOn() && props.initialTour && props.initialTour.price > 0 ? await loadFx().catch(() => null) : null;
        const priceLabel = primeraPiezaOn() && props.initialTour ? tourPriceLabel(props.initialTour.price, props.initialTour.currency, rates, language) : null;
        return <TourDetailClient {...props} priceLabel={priceLabel} />;
    } catch (error) {
        // INC-003 (regla 7): un fallo de la base no es "no existe"; va al aviso con Reintentar.
        unstable_rethrow(error);
        console.error('Error fetching tour:', error);
        throw error;
    }
}
