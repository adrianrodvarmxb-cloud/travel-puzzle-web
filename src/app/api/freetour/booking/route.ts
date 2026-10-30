import { NextRequest, NextResponse } from 'next/server';
import { zFTBookingDTO } from '@/lib/api/schemas/FTBooking.Schema';
import { createGatewayClient } from '@/booking/gateway-client';
import { placeBooking, recordBooking, BookingRejected, type BookingRejectionCode } from '@/booking/service';
import { createBookingRepo } from '@/booking/repository';
import { findEventInfo } from '@/booking/lib/event-info';
import { newManageToken } from '@/booking/lib/token';
import { getPrisma } from '@/lib/prisma';
import { createFreetourApi } from '@/freetour/api';
import { resolveFreetourConfig } from '@/freetour/lib/hosts';
import { zFTEventDetail } from '@/lib/api/schemas/FTEvent.Schema';
import { isBookingsEnabled } from '@/booking/lib/flags';

export const dynamic = 'force-dynamic';

const STATUS: Record<BookingRejectionCode, number> = {
    bookings_disabled: 503,
    paid_not_available: 400,
    invalid_phone: 400,
    phone_required: 400,
    no_availability: 409,
    provider_error: 502,
};

/**
 * Reserva real en Freetour a través de la pasarela de Namecheap.
 * Detrás del interruptor BOOKINGS_ENABLED ("true" para activar).
 */
export async function POST(request: NextRequest) {
    const parsed = zFTBookingDTO.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: 'invalid_booking', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const freetour = createFreetourApi({ config: resolveFreetourConfig(process.env), fetch });
        const { booking, price } = await placeBooking(parsed.data, {
            enabled: isBookingsEnabled(process.env.BOOKINGS_ENABLED),
            getEvent: async (id) => zFTEventDetail.parse(((await freetour.get(`/event/${id}`)) as { data: unknown }).data),
            gateway: createGatewayClient({
                url: process.env.GATEWAY_URL ?? '',
                secret: process.env.GATEWAY_SECRET ?? '',
                fetch,
            }),
        });
        const record = await recordBooking(
            { booking, request: parsed.data, price },
            {
                getEventInfo: async (tourId, eventId) => findEventInfo(await freetour.get(`/tours/${tourId}/events`), eventId),
                save: (r) => createBookingRepo(getPrisma()).save(r),
                newToken: newManageToken,
                now: new Date(),
            }
        );
        return NextResponse.json({ success: true, booking, manageToken: record?.manageToken ?? null });
    } catch (error) {
        if (error instanceof BookingRejected) {
            return NextResponse.json({ error: error.code, message: error.message }, { status: STATUS[error.code] });
        }
        console.error('[reservas] error inesperado:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'provider_error', message: 'No pudimos confirmar tu reserva en este momento.' }, { status: 502 });
    }
}
