// REQ-148: proveedores que el agente puede encender o apagar (FREETOUR bloqueado).
import { NextRequest, NextResponse } from 'next/server';
import { listaProveedores } from '@/agente/lib/catalogo';
import { catalogoDeps } from '@/agente/catalogo';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    try {
        const deps = await catalogoDeps();
        // REQ-10845 (decisión 40): Tangol se ofrece solo con TANGOL_ENABLED (la misma bandera que lo muestra al público).
        return NextResponse.json({ proveedores: listaProveedores(await deps.agencias(), { tangol: process.env.TANGOL_ENABLED === 'true' }) }, sinCache);
    } catch (e) {
        console.error('[agente] proveedores:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
