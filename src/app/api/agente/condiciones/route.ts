// REQ-3355: condiciones de los proveedores publicados para el agente (solo lectura; REQ-3358 sin netos ni márgenes).
// Antes de aplicar la 0030 (REQ-3522) las columnas no existen: responde con las condiciones vacías («completas: false»).
import { NextRequest, NextResponse } from 'next/server';
import { condicionesParaAgente, type FilaCondiciones } from '@/agente/lib/condiciones';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const id = (req.nextUrl.searchParams.get('proveedor') ?? '').slice(0, 80) || undefined;
    try {
        const { getPrisma } = await import('@/lib/prisma');
        const filas = await getPrisma().$queryRawUnsafe<(Omit<FilaCondiciones, 'publicado' | 'bloqueado'> & { publicado: number; bloqueado: number })[]>(
            'SELECT * FROM "Proveedor" WHERE "publicado" = 1 AND "bloqueado" = 0');
        const lista = condicionesParaAgente(filas.map((f) => ({ ...f, publicado: !!f.publicado, bloqueado: !!f.bloqueado })), id);
        return NextResponse.json({ proveedores: lista }, sinCache);
    } catch (e) {
        console.error('[agente] condiciones:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
