// REQ-150/151: antes de dar la liga, el agente revisa en vivo el viaje elegido (fecha y precio) y recibe la liga prellenada.
import { NextRequest, NextResponse } from 'next/server';
import { enlacePrellenado, leerPrellenado, proveedorDe, revisarFecha } from '@/agente/lib/catalogo';
import { catalogoDeps, viajesParaAgente } from '@/agente/catalogo';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const sp = req.nextUrl.searchParams;
    const slug = sp.get('slug') ?? '';
    const proveedores = new Set((sp.get('proveedores') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    const p = leerPrellenado(Object.fromEntries(sp.entries()));
    try {
        const v = (await viajesParaAgente(await catalogoDeps(), 'es')).find((x) => x.slug === slug);
        if (!v || !proveedores.has(proveedorDe(v))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const fecha = p.fecha ? revisarFecha(v, p.fecha) : null;
        const base = process.env.SITE_URL ?? 'https://travelpuzzle.com.mx';
        return NextResponse.json({
            slug: v.slug, titulo: v.title, precio: v.price, proximasFechas: v.dates.slice(0, 5), fecha,
            enlace: enlacePrellenado(base, v.path, fecha && !fecha.disponible ? { adultos: p.adultos, ninos: p.ninos } : p),
        }, sinCache);
    } catch (e) {
        console.error('[agente] viaje:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
