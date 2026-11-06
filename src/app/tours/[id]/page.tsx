import { notFound, unstable_rethrow } from 'next/navigation';
import { TourDetailClient } from '@/components/tours/one';
import { fetchTourById } from '@/actions/tours';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { transformDBTourToUITour } from '@/lib/db/tour-transformer';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';
import type { Metadata } from 'next';
import { tourMeta } from '@/seo/lib/meta';
import { loadTourDetailProps } from '@/tours/detail-props';

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
        // La carga vive en src/tours/detail-props.ts (la comparte la ficha de /destinos).
        const props = await loadTourDetailProps(tourId, language);
        if (!props) {
            notFound();
        }
        return <TourDetailClient {...props} />;
    } catch (error) {
        // INC-003 (regla 7): un fallo de la base no es "no existe"; va al aviso con Reintentar.
        unstable_rethrow(error);
        console.error('Error fetching tour:', error);
        throw error;
    }
}
