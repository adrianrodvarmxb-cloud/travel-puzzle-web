import { NextResponse } from 'next/server';
import { refundOverdue } from '@/trips/direct-buy';
import { buyDeps } from '@/trips/direct-buy-deps';

export const dynamic = 'force-dynamic';

/** REQ-3534: cada 10 min, reembolso automático de las compras directas que pasaron 48 h sin respuesta del proveedor. */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Corre aunque la bandera se apague: una compra ya pagada siempre se resuelve.
    return NextResponse.json({ success: true, ...(await refundOverdue(buyDeps())) });
}
