import { NextResponse } from 'next/server';
import { cartFlags } from '@/cart/lib/flags';
import { parseCarouselEvent } from '@/companions/lib/events';

export const dynamic = 'force-dynamic';

/**
 * REQ-110: recibe los eventos del carrusel (vista, agregada, reservada, cotización por WhatsApp)
 * por tipo y ciudad, sin datos personales. Se registran en los logs del Worker (observability)
 * con la etiqueta [carrusel-evento]. Con la bandera apagada responde 404.
 */
export async function POST(req: Request) {
    if (!cartFlags(process.env as Record<string, string | undefined>).enabled) return new NextResponse(null, { status: 404 });
    const body = await req.json().catch(() => null);
    const event = parseCarouselEvent({ ...(body ?? {}), at: new Date().toISOString() });
    if (!event) return NextResponse.json({ ok: false }, { status: 400 });
    console.log('[carrusel-evento]', JSON.stringify(event));
    return NextResponse.json({ ok: true });
}
