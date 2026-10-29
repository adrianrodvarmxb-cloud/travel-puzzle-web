'use client';

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
import { useEventsByTourFTData } from '@/lib/api/hooks/useEventsByTourFTData';

interface TourDetailClientProps {
    tourId: string;
    initialTour: Tour | null;
    initialTourData: TourWithRelations | null;
    initialLanguage: SupportedLanguage;
}

export function TourDetailClient({
    tourId,
    initialTour,
    initialTourData,
    initialLanguage,
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

            <div className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    {t('common.back')} to {t('tours.title')}
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
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <TourSidebar
                            tour={tour}
                            events={eventsFTData || []}
                            isLoadingEvents={isLoadingEvents}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

