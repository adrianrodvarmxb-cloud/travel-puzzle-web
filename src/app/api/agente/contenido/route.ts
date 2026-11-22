// REQ-3347: blog, guías de destino y ayuda publicados, para el agente (solo lectura).
import { NextRequest, NextResponse } from 'next/server';
import { buscarContenido } from '@/agente/lib/contenido';
import { loadVisiblePosts, blogEnv } from '@/blog/load';
import { loadGuides } from '@/destinations/guias';
import { faqTopics, isHelpVisible } from '@/help/lib/faq';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 300);
    try {
        const env = process.env as Record<string, string | undefined>;
        const faq = isHelpVisible(env.BOOKINGS_ENABLED) ? faqTopics('es').flatMap((t) => t.items) : [];
        const resultados = buscarContenido(q, { posts: loadVisiblePosts(blogEnv(env)), guias: loadGuides(), faq }, env.SITE_URL ?? 'https://travelpuzzle.com.mx');
        return NextResponse.json({ resultados }, sinCache);
    } catch (e) {
        console.error('[agente] contenido:', (e as Error).message);
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
}
