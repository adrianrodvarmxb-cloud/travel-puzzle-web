import { NextResponse } from 'next/server';
import { z } from 'zod';
import { REQUEST_STATUSES } from '@/trips/lib/request';
import { requireAdmin } from '@/trips/deps';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Cambia el estado o las notas internas de una solicitud. Solo ADMIN. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = z.object({ status: z.enum(REQUEST_STATUSES).optional(), notes: z.string().max(4000).optional() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    await getPrisma().tripRequest.update({ where: { id: (await params).id }, data: parsed.data });
    return NextResponse.json({ ok: true });
}
