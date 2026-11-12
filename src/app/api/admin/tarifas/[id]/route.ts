import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/trips/deps';
import { proveedoresEncendido, tarifaDeps } from '@/proveedores/deps';
import { confirmarTarifa, descartarTarifa } from '@/proveedores/tarifa';

export const dynamic = 'force-dynamic';

/** REQ-1672, REQ-1580: botón Confirmar o Descartar de un cambio de tarifa. Solo ADMIN. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const env = process.env as Record<string, string | undefined>;
    if (!proveedoresEncendido(env)) return NextResponse.json({ error: 'Proveedores apagado' }, { status: 409 });
    const parsed = z.object({ accion: z.enum(['confirmar', 'descartar']), tarifaId: z.string().max(100).optional() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    const deps = tarifaDeps(env);
    const { id } = await params;
    const r = parsed.data.accion === 'confirmar' ? await confirmarTarifa(id, 'PO (panel)', deps, parsed.data.tarifaId) : await descartarTarifa(id, deps);
    return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
