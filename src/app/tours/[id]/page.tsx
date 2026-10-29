import { notFound } from 'next/navigation';
import { TourDetailClient } from '@/components/tours/one';
import { fetchTourById } from '@/actions/tours';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { transformDBTourToUITour } from '@/lib/db/tour-transformer';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';

interface TourDetailPageProps {
    params: Promise<{ id: string }>;
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

        return (
            <TourDetailClient
                tourId={tourId}
                initialTour={initialTour}
                initialTourData={tourData as unknown as TourWithRelations}
                initialLanguage={language}
            />
        );
    } catch (error) {
        console.error('Error fetching tour:', error);
        notFound();
    }
}
