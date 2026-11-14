// REQ-3354: ficha completa de un viaje publicado para el agente (solo lectura, misma llave y bandera que /buscar).
import { NextRequest, NextResponse } from 'next/server';
import { proveedorDe } from '@/agente/lib/catalogo';
import { fichaParaAgente } from '@/agente/lib/detalle';
import { catalogoDeps, viajesParaAgente, fichaDeps } from '@/agente/catalogo';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const sp = req.nextUrl.searchParams;
    const slug = (sp.get('slug') ?? '').slice(0, 120);
    const proveedores = new Set((sp.get('proveedores') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    try {
        const v = (await viajesParaAgente(await catalogoDeps(), 'es')).find((x) => x.slug === slug);
        if (!v || !proveedores.has(proveedorDe(v))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const data = await (await fichaDeps()).trip(slug);
        if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        return NextResponse.json(fichaParaAgente(data.trip, process.env.SITE_URL ?? 'https://travelpuzzle.com.mx', v.path), sinCache);
    } catch (e) {
        console.error('[agente] detalle:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
