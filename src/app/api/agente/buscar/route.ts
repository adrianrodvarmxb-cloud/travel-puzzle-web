// REQ-123: búsqueda de solo lectura para el agente (?q=&proveedores=propios,agencia:x). Sin datos de clientes ni reservas.
import { NextRequest, NextResponse } from 'next/server';
import { buscarViajes, enlacePrellenado, proveedorDe } from '@/agente/lib/catalogo';
import { catalogoDeps, viajesParaAgente } from '@/agente/catalogo';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') ?? '').slice(0, 300);
    const proveedores = (sp.get('proveedores') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
    try {
        const viajes = await viajesParaAgente(await catalogoDeps(), 'es');
        const base = process.env.SITE_URL ?? 'https://travelpuzzle.com.mx';
        const resultados = buscarViajes(viajes, { q, proveedores }).map((v) => ({
            slug: v.slug, titulo: v.title, resumen: v.summary.slice(0, 280), lugares: v.places, ciudades: v.cities, tipo: v.kind,
            proveedor: proveedorDe(v), precio: v.price, duracionDias: v.durationDays, proximasFechas: v.dates.slice(0, 5),
            enlace: enlacePrellenado(base, v.path, {}),
        }));
        return NextResponse.json({ resultados }, sinCache);
    } catch (e) {
        console.error('[agente] buscar:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
