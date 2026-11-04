/** Dependencias reales del pago (pasarela + D1 + correo). La lógica vive en payment.ts. */
import { getPrisma } from '@/lib/prisma';
import { createBookingRepo } from './repository';
import { createGatewayClient } from './gateway-client';
import { sendConfirmationFor } from './confirmation-send';
import type { PaymentRow } from './payment';
import type { BookingRecord } from './lib/booking-record';

export function paymentDeps(lang: 'es' | 'en' = 'es') {
    const repo = createBookingRepo(getPrisma());
    const gw = createGatewayClient({ url: process.env.GATEWAY_URL ?? '', secret: process.env.GATEWAY_SECRET ?? '', fetch });
    return {
        repo,
        load: async (token: string) => (await repo.findPaymentByToken(token)) as PaymentRow | null,
        getPaymentStatus: (id: string) => gw.getPaymentStatus(id),
        markPayment: (ref: string, outcome: string, now: Date) => repo.markPayment(ref, outcome, now),
        sendConfirmation: async (ref: string) => {
            const record = await repo.findByRef(ref);
            if (record) await sendConfirmationFor(record as unknown as BookingRecord, lang);
        },
        now: new Date(),
    };
}
