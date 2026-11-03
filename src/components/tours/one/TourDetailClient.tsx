'use client';

import { TourReviews } from '@/components/reviews';
import type { ReviewView } from '@/reviews/load';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { ChevronLeftIcon } from '@/assets/svg';
import { useTour } from '@/lib/queries/tours';
import { transformDBTourToUITour } from '@/lib/db/tour-transformer';
import { useToursFTData } from '@/lib/api/hooks';
import { useEffect, useMemo } from 'react';
import { Tour, SupportedLanguage } from '@/types';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';
import { TourErrorState } from './TourErrorState';
import { TourHeroSection } from './TourHeroSection';
import { TourDescription } from './TourDescription';
import { TourIncludes } from './TourIncludes';
import { TourMeetingPoint } from './TourMeetingPoint';
import { TourSidebar } from './TourSidebar';
import { TourMobileBar } from './TourMobileBar';
import { bookingMode } from '@/tours/lib/booking-cta';
import { useEventsByTourFTData } from '@/lib/api/hooks/useEventsByTourFTData';

interface TourDetailClientProps {
    tourId: string;
    initialTour: Tour | null;
    initialTourData: TourWithRelations | null;
    initialLanguage: SupportedLanguage;
    reviews?: ReviewView[];
    reviewsTotal?: number;
    /** Interruptor BOOKINGS_ENABLED (lo decide el servidor). */
    bookingsEnabled?: boolean;
    /** WhatsApp de Travel Puzzle para apartar con un asesor. */
    whatsapp?: string;
}

export function TourDetailClient({
    tourId,
    initialTour,
    initialTourData,
    initialLanguage,
    reviews = [],
    reviewsTotal = 0,
    bookingsEnabled = false,
    whatsapp,
}: TourDetailClientProps) {
    const router = useRouter();
    const { t, language } = useLanguage();

    // Fetch tour data (will use initialData if query key matches)
    const { data: tourMockData, isLoading, error } = useTour(tourId, language, {
        initialData: language === initialLanguage && initialTourData ? initialTourData : undefined,
    });

    // Fetch FreeTour data if externalId exists (fallback)
    const { data: tourFTData } = useToursFTData(
        tourMockData?.externalId ? tourMockData.externalId.toString() : null
    );

    // Transform DB tour to UI tour format
    const tourDB = tourMockData
        ? transformDBTourToUITour(tourMockData as unknown as TourWithRelations, language)
        : null;

    // Determine which tour to display
    const tour = useMemo<Tour | null>(() => {
        // Use initial tour if language matches and no new data
        if (language === initialLanguage && initialTour && !tourDB) {
            return initialTour;
        }
        // Prefer DB tour over FreeTour data
        if (tourDB) {
            return tourDB;
        }
        // Fallback to FreeTour data
        if (tourFTData) {
            return tourFTData;
        }
        return null;
    }, [tourDB, tourFTData, initialTour, language, initialLanguage]);

    const { data: eventsFTData, isLoading: isLoadingEvents } = useEventsByTourFTData(tour?.externalId?.toString() || null);

    if (isLoading && !tour) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tp-blue-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">{t('common.loading')}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !tour) {
        return <TourErrorState tour={!!tourMockData} />;
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="tp-dark">
            {/* .container del sitio no trae padding: el margen lateral va explícito */}
            <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-8 lg:pb-8">
                {/* Back Button */}
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    {t('tours.backToTours', 'Back to all tours')}
                </Button>

                {/* Hero Section */}
                <TourHeroSection tour={tour} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        {tour.description && <TourDescription description={tour.description} />}

                        {/* What's Included */}
                        {tour.includes && tour.includes.length > 0 && (
                            <TourIncludes includes={tour.includes} />
                        )}

                        {/* Meeting Point */}
                        {tour.meetingPoint && <TourMeetingPoint meetingPoint={tour.meetingPoint} />}

                        {/* Reseñas reales */}
                        <TourReviews reviews={reviews} total={reviewsTotal} />
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <TourSidebar
                            tour={tour}
                            events={eventsFTData || []}
                            isLoadingEvents={isLoadingEvents}
                            mode={bookingMode(bookingsEnabled)}
                            whatsapp={whatsapp}
                        />
                    </div>
                </div>
            </div>
            <TourMobileBar tour={tour} mode={bookingMode(bookingsEnabled)} whatsapp={whatsapp} />
            </div>
        </div>
    );
}

