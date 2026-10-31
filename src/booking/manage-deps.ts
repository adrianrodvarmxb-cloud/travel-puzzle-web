import { getPrisma } from '@/lib/prisma';
import { createBookingRepo } from './repository';
import { createGatewayClient } from './gateway-client';
import type { ManageDeps } from './manage';

/** Dependencias reales (D1 + pasarela) de la página de la reserva. Solo servidor. */
export function manageDeps() {
    const repo = createBookingRepo(getPrisma());
    const gateway = createGatewayClient({ url: process.env.GATEWAY_URL ?? '', secret: process.env.GATEWAY_SECRET ?? '', fetch });
    const deps: ManageDeps & { cancel: typeof gateway.cancelBooking } = {
        findByToken: (t) => repo.findByToken(t),
        getRemote: async (ref) => {
            const b = await gateway.getBooking(ref);
            return { status: b.status, canBeCanceled: Number(b.canBeCanceled), canBeEdited: Number(b.canBeEdited) };
        },
        setStatus: (ref, status) => repo.setStatus(ref, status),
        cancel: (r) => gateway.cancelBooking(r),
    };
    return deps;
}
