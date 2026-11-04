import { notFound } from 'next/navigation';
import { TourDetailClient } from '@/components/tours/one';
import { fetchTourById } from '@/actions/tours';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { transformDBTourToUITour } from '@/lib/db/tour-transformer';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';
import { loadTourReviews } from '@/reviews/load';
import type { Metadata } from 'next';
import { tourMeta } from '@/seo/lib/meta';
import { contactFromEnv } from '@/booking/tour-summary';
import { cityLabel, transportForPlace } from '@/trips/cross-sell';
import { crossSellDeps } from '@/trips/cross-sell-deps';

interface TourDetailPageProps {
    params: Promise<{ id: string }>;
}

/** Vista previa al compartir el tour: su foto, título con ★ y reseñas, y su descripción corta. */
export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const language = await getPreferredLanguage();
    try {
        const data = await fetchTourById(id, language);
        if (!data) return {};
        const tour = transformDBTourToUITour(data as unknown as TourWithRelations, language);
        const m = tourMeta({ title: tour.title, brief: tour.brief, rating: tour.rating, reviews: tour.reviewsNumber, image: tour.titleImageURL ?? tour.images[0] ?? null }, language);
        return {
            title: { absolute: m.title },
            description: m.description,
            alternates: { canonical: `/tours/${id}` },
            openGraph: { type: 'website', title: m.title, description: m.description, url: `/tours/${id}`, images: [{ url: m.image }] },
            twitter: { card: 'summary_large_image', title: m.title, description: m.description, images: [m.image] },
        };
    } catch {
        return {};
    }
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
    // Get language from cookies, default to 'en'
    const language = await getPreferredLanguage();

    // Get tour ID from params
    const { id } = await params;
    const tourId = id;

    if (!tourId) {
        notFound();
    }

    try {
        // Fetch tour data from DB
        const tourData = await fetchTourById(tourId, language);

        if (!tourData) {
            notFound();
        }

        // Transform DB tour to UI tour format
        const initialTour = transformDBTourToUITour(
            tourData as unknown as TourWithRelations,
            language
        );

        // Reseñas reales de Freetour (caché de 7 días en D1)
        const { reviews, total } = await loadTourReviews(
            (tourData as { externalId: number }).externalId,
            language,
            30
        );

        const env = process.env as Record<string, string | undefined>;
        // REQ-005/006: transporte de la misma ciudad o país (vacío si TRANSPORT_ENABLED está apagado). Si falla, la ficha sigue.
        const rel = tourData as unknown as { city?: { translations?: unknown }; country?: { code?: string } };
        const place = { city: cityLabel(rel.city?.translations, 'es'), country: rel.country?.code ?? null };
        const items = await transportForPlace(place, language, crossSellDeps()).catch((e) => { console.error('[venta cruzada]', (e as Error).message); return []; });
        const crossSell = items.length ? { city: cityLabel(rel.city?.translations, language) ?? place.city ?? '', items } : null;
        return (
            <TourDetailClient
                tourId={tourId}
                initialTour={initialTour}
                initialTourData={tourData as unknown as TourWithRelations}
                initialLanguage={language}
                reviews={reviews}
                reviewsTotal={total}
                bookingsEnabled={env.BOOKINGS_ENABLED === 'true'}
                paidEnabled={env.PAID_TOURS_ENABLED === 'true'}
                whatsapp={contactFromEnv(env).whatsapp}
                crossSell={crossSell}
            />
        );
    } catch (error) {
        console.error('Error fetching tour:', error);
        notFound();
    }
}
