'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClockIcon, MapPinIcon, ShieldIcon, StarIcon } from '@/assets/svg';
import { Tour } from '@/types';
import { TourEvent } from '@/lib/api/freetour-client';
import { TourAvailabilityCalendar } from './TourAvailabilityCalendar';
import { TourAvailabilityCalendarSkeleton } from './TourAvailabilityCalendarSkeleton';

interface TourSidebarProps {
    tour: Tour;
    events?: TourEvent[];
    isLoadingEvents?: boolean;
}

export function TourSidebar({ tour, events = [], isLoadingEvents = false }: TourSidebarProps) {
    const { t } = useLanguage();

    const handleBooking = () => {
        if (tour.bookingURL) {
            window.open(tour.bookingURL, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Card className="sticky top-8">
            <CardContent className="p-6">
                {/* Price */}
                <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">{t('tours.from')}</span>
                        <span className="text-4xl font-bold">
                            {tour.price > 0 ? `${tour.currency} ${tour.price}` : t('tours.free')}
                        </span>
                    </div>
                    {tour.rating && (
                        <div className="flex items-center gap-2 mt-2">
                            <StarIcon className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{tour.rating}</span>
                            <span className="text-sm text-muted-foreground">
                                ({tour.reviewsNumber} {tour.reviewsNumber === 1 ? 'review' : 'reviews'})
                            </span>
                        </div>
                    )}
                </div>

                {/* Booking Button */}
                {events.length > 0 && <Button
                    variant="accent"
                    size="lg"
                    className="w-full mb-6"
                    onClick={handleBooking}
                >
                    {t('tours.bookNow')}
                </Button>}

                {/* Availability Calendar */}
                {tour.externalId && (
                    <div className="mb-6 border-t pt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {t('tours.availability')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {isLoadingEvents ? (
                                    <TourAvailabilityCalendarSkeleton />
                                ) : events.length > 0 ? (
                                    <TourAvailabilityCalendar events={events} tourId={tour.id} />
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        {t('tours.noAvailability')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tour Details */}
                <div className="space-y-4 border-t pt-6">
                    <div className="flex items-start gap-3">
                        <ClockIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">{t('tours.duration')}</p>
                            <p className="text-sm text-muted-foreground">{tour.duration}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <MapPinIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">{t('tours.destination')}</p>
                            <p className="text-sm text-muted-foreground">{tour.destination}</p>
                        </div>
                    </div>

                    {tour.provider && (
                        <div className="flex items-start gap-3">
                            <ShieldIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium">{t('tours.provider')}</p>
                                <p className="text-sm text-muted-foreground">{tour.provider}</p>
                                {tour.providerPhone && (
                                    <a
                                        href={`tel:${tour.providerPhone}`}
                                        className="text-sm text-tp-blue-primary hover:underline mt-1 block"
                                    >
                                        {tour.providerPhone}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

