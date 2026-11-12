import { NextResponse } from 'next/server';
import { z } from 'zod';
import { proveedoresEncendido, tarifaDeps } from '@/proveedores/deps';
import { confirmarTarifa } from '@/proveedores/tarifa';
import { leerComandoConfirmo } from '@/proveedores/lib/tarifas';

export const dynamic = 'force-dynamic';

/** REQ-1580: «confirmo T-12» por WhatsApp. Lo llama el puente de Mila (REQ-1570) con PROVEEDORES_COMANDO_SECRET; sin secreto no hace nada. */
export async function POST(request: Request) {
    const secreto = process.env.PROVEEDORES_COMANDO_SECRET;
    if (!secreto || request.headers.get('authorization') !== `Bearer ${secreto}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const env = process.env as Record<string, string | undefined>;
    if (!proveedoresEncendido(env)) return NextResponse.json({ success: true, skipped: 'proveedores_off' });
    const parsed = z.object({ texto: z.string().max(200) }).safeParse(await request.json().catch(() => null));
    const codigo = parsed.success ? leerComandoConfirmo(parsed.data.texto) : null;
    if (!codigo) return NextResponse.json({ ok: false, motivo: 'Escribe «confirmo T-<número>»' }, { status: 400 });
    const r = await confirmarTarifa(Number(codigo.slice(2)), 'PO (WhatsApp)', tarifaDeps(env));
    return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
