// REQ-149: búsqueda de solo lectura para el agente (?q=&proveedores=propios,agencia:x). Sin datos de clientes ni reservas.
// REQ-10849 (decisión 40): también busca en los tours de Tangol (índice del modelo común); salen solo si `tangol` viene
// entre los proveedores encendidos, con la liga a su ficha pública. FREETOUR nunca (decisión 42).
import { NextRequest, NextResponse } from 'next/server';
import { buscarViajes, enlacePrellenado, proveedorDe } from '@/agente/lib/catalogo';
import { catalogoDeps, toursParaAgente, viajesParaAgente } from '@/agente/catalogo';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const sp = req.nextUrl.searchParams;
    const q = (sp.get('q') ?? '').slice(0, 300);
    const proveedores = (sp.get('proveedores') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
    try {
        const deps = await catalogoDeps();
        const pideTours = proveedores.some((p) => !p.startsWith('agencia:') && p !== 'propios');
        const [viajes, tours] = await Promise.all([viajesParaAgente(deps, 'es'), pideTours ? toursParaAgente(deps, 'es') : Promise.resolve([])]);
        const base = process.env.SITE_URL ?? 'https://travelpuzzle.com.mx';
        const resultados = buscarViajes([...viajes, ...tours], { q, proveedores }).map((v) => ({
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
