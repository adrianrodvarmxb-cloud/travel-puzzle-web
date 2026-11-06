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
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { CrossSellStrip } from '@/components/trips/CrossSellStrip';
import { CompleteTripSheet } from '@/components/trips/CompleteTripSheet';
import type { CrossItem } from '@/trips/cross-sell';
import { advisorTextWithExtras, crossSellCopy, shouldOfferSheet } from '@/trips/lib/cross-sell-copy';
import { advisorText } from '@/tours/lib/booking-cta';
import { waLink } from '@/home/lib/copy';
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
import { tipGuide } from '@/tours/lib/tip-guide';
import { paidPolicy } from '@/tours/lib/paid-policy';
import { useEventsByTourFTData } from '@/lib/api/hooks/useEventsByTourFTData';
import { Breadcrumbs } from '@/components/destinations/Breadcrumbs';
import type { PrimeraPiezaView } from './PrimeraPiezaInfo';
import type { TourPriceLabel } from '@/tours/lib/price-label';

interface TourDetailClientProps {
    tourId: string;
    initialTour: Tour | null;
    initialTourData: TourWithRelations | null;
    initialLanguage: SupportedLanguage;
    reviews?: ReviewView[];
    reviewsTotal?: number;
    /** Interruptor BOOKINGS_ENABLED (lo decide el servidor). */
    bookingsEnabled?: boolean;
    /** PAID_TOURS_ENABLED: política de pago y no presentarse en tours con costo. */
    paidEnabled?: boolean;
    /** WhatsApp de Travel Puzzle para apartar con un asesor. */
    whatsapp?: string;
    /** REQ-005/006: transporte de la misma ciudad (o país), calculado en el servidor. */
    crossSell?: { city: string; items: CrossItem[] } | null;
    /** REQ-094…098: ficha bajo /destinos (PRIMERA_PIEZA_ENABLED). Sin esto la ficha queda igual que hoy. */
    primeraPieza?: PrimeraPiezaView | null;
    /** REQ-170: precio en EUR con MXN aproximado, calculado en el servidor (solo con PRIMERA_PIEZA_ENABLED). */
    priceLabel?: TourPriceLabel | null;
}

export function TourDetailClient({
    tourId,
    initialTour,
    initialTourData,
    initialLanguage,
    reviews = [],
    reviewsTotal = 0,
    bookingsEnabled = false,
    paidEnabled = false,
    whatsapp,
    crossSell = null,
    primeraPieza = null,
    priceLabel = null,
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

    // REQ-006: ventana "Completa tu viaje" antes de abrir WhatsApp (una vez por visita).
    const [sheetOpen, setSheetOpen] = useState(false);
    const csItems = crossSell?.items ?? [];
    const csCopy = crossSellCopy(language);
    const dismissedKey = 'tp-cross-sell-done';
    const readDismissed = () => { try { return sessionStorage.getItem(dismissedKey) === '1'; } catch { return false; } };
    const onAdvisorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!shouldOfferSheet(csItems.length, readDismissed())) return;
        e.preventDefault();
        setSheetOpen(true);
    };
    const onSheetDone = (titles: string[]) => {
        setSheetOpen(false);
        try { sessionStorage.setItem(dismissedKey, '1'); } catch { /* sin almacenamiento: se vuelve a ofrecer */ }
        const href = waLink(whatsapp, advisorTextWithExtras(advisorText(tour?.title ?? '', language), titles, language));
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
    };

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
                {/* REQ-100: en /destinos, migas visibles en lugar del botón de regreso */}
                {primeraPieza ? (
                    <div className="mb-6"><Breadcrumbs items={primeraPieza.crumbs} /></div>
                ) : (
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    {t('tours.backToTours', 'Back to all experiences')}
                </Button>
                )}

                {/* Hero Section */}
                <TourHeroSection tour={tour} primeraPieza={primeraPieza} events={eventsFTData || []} />

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
                            priceLabel={priceLabel}
                            events={eventsFTData || []}
                            isLoadingEvents={isLoadingEvents}
                            mode={bookingMode(bookingsEnabled)}
                            whatsapp={whatsapp}
                            paidPolicy={paidEnabled ? paidPolicy(null, language) : null}
                            tipGuide={tipGuide((initialTourData as { country?: { code?: string } } | null)?.country?.code, language)}
                            onAdvisorClick={onAdvisorClick}
                            below={crossSell && csItems.length > 0 ? (
                                <SectionBoundary name="franja-transporte">
                                    <CrossSellStrip eyebrow={csCopy.stripEyebrow(crossSell.city)} question={csCopy.stripQuestion} from={csCopy.from} items={csItems.slice(0, 1)} />
                                </SectionBoundary>
                            ) : null}
                        />
                    </div>
                </div>
            </div>
            <TourMobileBar tour={tour} priceLabel={priceLabel} mode={bookingMode(bookingsEnabled)} whatsapp={whatsapp} onAdvisorClick={onAdvisorClick} />
            {sheetOpen && crossSell && (
                <SectionBoundary name="ventana-completa-tu-viaje">
                    <CompleteTripSheet city={crossSell.city} items={csItems} copy={csCopy} onDone={onSheetDone} />
                </SectionBoundary>
            )}
            </div>
        </div>
    );
}

