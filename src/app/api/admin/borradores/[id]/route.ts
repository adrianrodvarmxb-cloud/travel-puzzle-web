import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/trips/deps';
import { borradoresEncendido, proveedoresDeps, proveedoresEncendido } from '@/proveedores/deps';
import { accionDelPO, enviarVencidos } from '@/proveedores/borradores';
import { REMITENTE } from '@/proveedores/lib/correo';
import { modoBorradores } from '@/proveedores/lib/borradores'; // REQ-10762

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('accion', [
    z.object({ accion: z.literal('cancelar'), motivo: z.string().max(300).optional() }),
    z.object({ accion: z.literal('enviar_ahora') }),
    z.object({ accion: z.literal('editar'), asunto: z.string().max(300).optional(), texto: z.string().max(20_000).optional(), enviarEn: z.string().datetime().optional() }),
]);

/** REQ-10693: cancelar, editar o mandar ya un borrador programado. Solo ADMIN. «Enviar ya» lo manda en la misma llamada. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const env = process.env as Record<string, string | undefined>;
    if (!proveedoresEncendido(env) || !borradoresEncendido(env)) return NextResponse.json({ error: 'Bandeja apagada' }, { status: 409 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    const { borradores, enviar, avisarPO } = proveedoresDeps(env);
    const hoy = new Date().toISOString();
    const { id } = await params;
    const r = await accionDelPO(id, parsed.data, { repo: borradores, hoy });
    if (!r.ok) return NextResponse.json(r, { status: 409 });
    // REQ-10762: «Enviar ya» manda solo este borrador (en modo manual, nada más sale).
    const salida = parsed.data.accion === 'enviar_ahora' ? await enviarVencidos({ repo: borradores, enviar, hoy, siteUrl: env.SITE_URL ?? '', avisarPO, log: console.log, modo: modoBorradores(env), soloId: id }, REMITENTE) : null;
    return NextResponse.json({ ok: true, estado: r.borrador.estado, salida });
}
