// REQ-10837: ficha completa de un viaje para el agente (Mila), desde el modelo común y su lector de Mila (decisión 39).
// Misma puerta que el resto de la ventana (bandera + llave, REQ-152) y mismo filtro de proveedores encendidos (REQ-148).
// FREETOUR nunca llega: el lector devuelve null y la ruta responde 404 (decisión 42). Sin neto, margen ni teléfonos.
import { NextRequest, NextResponse } from 'next/server';
import { detalleAgente, proveedorDeViaje } from '@/agente/lib/detalle';
import { loadTripFicha, tripFichaDeps } from '@/ficha/source';
import { readMila } from '@/ficha/lib/readers/mila';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const sp = req.nextUrl.searchParams;
    const slug = (sp.get('slug') ?? '').trim().slice(0, 200);
    const lang = sp.get('lang') === 'en' ? 'en' : 'es';
    const proveedores = new Set((sp.get('proveedores') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    if (!slug) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    try {
        const { load, agencyId, path } = await loadTripFicha(await tripFichaDeps(), slug, lang);
        if (!load.ok || !path || !proveedores.has(proveedorDeViaje(agencyId))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const read = readMila(load.ficha, { path });
        if (!read) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const base = process.env.SITE_URL ?? 'https://travelpuzzle.com.mx';
        return NextResponse.json(detalleAgente(load.ficha, read, { base, agencyId }), sinCache);
    } catch (e) {
        console.error('[agente] detalle:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
