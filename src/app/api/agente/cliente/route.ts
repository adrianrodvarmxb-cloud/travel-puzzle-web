// REQ-3356, REQ-3357: reservas y pagos del titular para el servicio de Mila. Detrás de AGENTE_CLIENTES_ON (apagada).
import { NextRequest, NextResponse } from 'next/server';
import { clientesEncendido, verificarTitular, resumenReserva, type PagoCliente, type SolicitudCliente } from '@/agente/lib/cliente';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    if (!clientesEncendido(process.env as Record<string, string | undefined>)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const sp = req.nextUrl.searchParams;
    const q = { telefono: (sp.get('telefono') ?? '').slice(0, 20) || undefined, folio: (sp.get('folio') ?? '').slice(0, 40) || undefined, correo: (sp.get('correo') ?? '').slice(0, 200) || undefined };
    try {
        const { getPrisma } = await import('@/lib/prisma');
        const prisma = getPrisma();
        const select = { id: true, ref: true, tripTitle: true, kind: true, status: true, date: true, endDate: true, optionName: true, adults: true, children: true, infants: true, email: true, phone: true } as const;
        const candidatas: SolicitudCliente[] = q.folio
            ? await prisma.tripRequest.findMany({ where: { ref: q.folio.trim().toUpperCase() }, select })
            : await prisma.tripRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 2000, select });
        const v = verificarTitular(q, candidatas);
        if (!v.ok) return NextResponse.json(v, sinCache);
        const pagos = (await prisma.payment.findMany({ where: { requestId: { in: v.ids } } })) as PagoCliente[];
        const ahora = new Date();
        return NextResponse.json({ ok: true, via: v.via, reservas: candidatas.filter((s) => v.ids.includes(s.id)).map((s) => resumenReserva(s, pagos, ahora)) }, sinCache);
    } catch (e) {
        console.error('[agente] cliente:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
