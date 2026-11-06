'use client';
import type React from 'react';

import { FreeTourGuide } from './FreeTourGuide';
import type { TipGuide } from '@/tours/lib/tip-guide';
import type { ShownPolicy as PaidPolicy } from '@/tours/lib/paid-policy';
import { PaidPolicyNotice } from '../PaidPolicyNotice';
import { formatRating } from '@/home/lib/format';
import { waLink } from '@/home/lib/copy';
import { advisorText, bookingCopy, crossSellSlot, type BookingMode } from '@/tours/lib/booking-cta';

/** El cliente contacta siempre a Travel Puzzle, nunca directo al guía (términos de Freetour, sección 2.2). */
const SHOW_PROVIDER_PHONE = false;
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClockIcon, MapPinIcon, ShieldIcon, StarIcon } from '@/assets/svg';
import { Tour } from '@/types';
import { TourEvent } from '@/lib/api/freetour-client';
import type { TourPriceLabel } from '@/tours/lib/price-label';
import { TourAvailabilityCalendar } from './TourAvailabilityCalendar';
import { TourAvailabilityCalendarSkeleton } from './TourAvailabilityCalendarSkeleton';

interface TourSidebarProps {
    tour: Tour;
    events?: TourEvent[];
    isLoadingEvents?: boolean;
    /** advisor: se aparta por WhatsApp (reservas apagadas); calendar: reserva en línea. */
    mode?: BookingMode;
    whatsapp?: string;
    /** Cómo funciona el free tour en este destino (solo tours sin costo). */
    tipGuide?: TipGuide | null;
    /** Pago y no presentarse (tours con costo, con PAID_TOURS_ENABLED). */
    paidPolicy?: PaidPolicy | null;
    /** REQ-006: antes de abrir WhatsApp se puede ofrecer el transporte (si devuelve true, no se abre aquí). */
    onAdvisorClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    /** REQ-005: contenido extra bajo el botón (franja de venta cruzada). */
    below?: React.ReactNode;
    /** REQ-170: EUR con MXN aproximado (del servidor). Sin esto, el precio queda como hoy. */
    priceLabel?: TourPriceLabel | null;
}

/** Duración, destino y proveedor ya se muestran arriba del tour; aquí se repetían (auditoría de diseño, nov 2026). */
const SHOW_DETAILS = false;

export function TourSidebar({ tour, events = [], isLoadingEvents = false, mode = 'calendar', whatsapp, tipGuide, paidPolicy, onAdvisorClick, below, priceLabel = null }: TourSidebarProps) {
    // REQ-170: solo si el precio del servidor es el mismo que pinta la ficha.
    const label = priceLabel && tour.price > 0 && priceLabel.amount === tour.price ? priceLabel : null;
    const { t, language } = useLanguage();
    const copy = bookingCopy(language);
    const wa = waLink(whatsapp, advisorText(tour.title, language));

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
                        {tour.price > 0 && <span className="text-sm text-muted-foreground">{t('tours.from')}</span>}
                        <span className="text-4xl font-bold">
                            {label ? label.main : tour.price > 0 ? `${tour.currency} ${tour.price}` : t('tours.free')}
                        </span>
                    </div>
                    {label && (
                        <div className="mb-2 text-sm text-muted-foreground">
                            {label.approx && <p className="font-medium">{label.approx}</p>}
                            {label.note && <p className="text-xs">{label.note}</p>}
                        </div>
                    )}
                    {tour.price > 0 && paidPolicy && <PaidPolicyNotice policy={paidPolicy} className="mt-3" />}
                    {tour.price === 0 && (tipGuide ? <FreeTourGuide guide={tipGuide} /> : (
                        <p className="text-sm text-muted-foreground">{t('tours.tipNote', 'At the end of the tour, tip the guide what you think is fair.')}</p>
                    ))}
                    {tour.rating && (
                        <div className="flex items-center gap-2 mt-2">
                            <StarIcon className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{formatRating(tour.rating)}</span>
                            <a href="#resenas" className="text-sm text-muted-foreground hover:underline">
                                ({t('reviews.count', '{count} reviews').replace('{count}', tour.reviewsNumber.toLocaleString('es-MX'))})
                            </a>
                        </div>
                    )}
                </div>

                {/* Apartar con un asesor mientras las reservas en línea están apagadas */}
                {mode === 'advisor' && (
                    <div className="mb-6 border-t pt-6">
                        <p className="font-display text-xl font-bold">{copy.advisorTitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{copy.advisorSub}</p>
                        {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" onClick={onAdvisorClick} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#C12909] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#A32207]">
                                {copy.advisorCta} →
                            </a>
                        )}
                        {crossSellSlot(mode) === 'under-advisor' && below}
                    </div>
                )}

                {/* Booking Button */}
                {mode === 'calendar' && events.length > 0 && <Button
                    variant="accent"
                    size="lg"
                    className="w-full mb-6"
                    onClick={handleBooking}
                >
                    {t('tours.bookNow')}
                </Button>}

                {/* Availability Calendar */}
                {mode === 'calendar' && tour.externalId && (
                    <div id="disponibilidad" className="mb-6 scroll-mt-24 border-t pt-6">
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

                {/* REQ-009: con reservas en línea la franja va bajo el calendario */}
                {crossSellSlot(mode) === 'under-calendar' && below && <div className="mb-6">{below}</div>}

                {/* Tour Details */}
                {SHOW_DETAILS && <div className="space-y-4 border-t pt-6">
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
                                {SHOW_PROVIDER_PHONE && tour.providerPhone && (
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
                </div>}
            </CardContent>
        </Card>
    );
}

