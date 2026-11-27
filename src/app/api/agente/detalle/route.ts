// REQ-10837: ficha completa de un viaje para el agente (Mila), desde el modelo común y su lector de Mila (decisión 39).
// Misma puerta que el resto de la ventana (bandera + llave, REQ-152) y mismo filtro de proveedores encendidos (REQ-148).
// FREETOUR nunca llega: el lector devuelve null y la ruta responde 404 (decisión 42). Sin neto, margen ni teléfonos.
// REQ-10845 (decisión 40): si el slug no es de un viaje, se busca como tour de Tangol (`ficha/source-tour`), y se entrega
// solo si `tangol` viene entre los proveedores encendidos; para reservar, la liga va a la ficha pública.
import { NextRequest, NextResponse } from 'next/server';
import { detalleAgente, proveedorDeViaje } from '@/agente/lib/detalle';
import { loadTripFicha, tripFichaDeps } from '@/ficha/source';
import { loadTourFicha, tourFichaDeps } from '@/ficha/source-tour';
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
        const base = process.env.SITE_URL ?? 'https://travelpuzzle.com.mx';
        const viaje = await loadTripFicha(await tripFichaDeps(), slug, lang);
        if (viaje.load.ok) {
            if (!viaje.path || !proveedores.has(proveedorDeViaje(viaje.agencyId))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
            const read = readMila(viaje.load.ficha, { path: viaje.path });
            if (!read) return NextResponse.json({ error: 'not_found' }, { status: 404 });
            return NextResponse.json(detalleAgente(viaje.load.ficha, read, { base, agencyId: viaje.agencyId }), sinCache);
        }
        if (viaje.load.reason !== 'not-found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
        // REQ-10845: no era un viaje; ¿es un tour de Tangol?
        const tour = await loadTourFicha(await tourFichaDeps(), slug, lang);
        if (!tour.load.ok || !tour.path || !tour.providerId || !proveedores.has(tour.providerId)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const read = readMila(tour.load.ficha, { path: tour.path });
        if (!read) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        return NextResponse.json(detalleAgente(tour.load.ficha, read, { base, agencyId: null, proveedor: tour.providerId }), sinCache);
    } catch (e) {
        console.error('[agente] detalle:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
