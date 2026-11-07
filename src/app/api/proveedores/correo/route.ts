import { NextResponse } from 'next/server';
import PostalMime from 'postal-mime';
import { proveedoresDeps, proveedoresEncendido } from '@/proveedores/deps';
import { procesarEntrante } from '@/proveedores/entrante';

export const dynamic = 'force-dynamic';

const direcciones = (xs?: { address?: string }[]) => (xs ?? []).map((x) => x.address ?? '').filter(Boolean);

/** REQ-1291, REQ-1296: el Worker reenvía aquí cada copia de los correos de comercial@ (correo crudo en el cuerpo). */
export async function POST(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const env = process.env as Record<string, string | undefined>;
    if (!proveedoresEncendido(env)) return NextResponse.json({ success: true, skipped: 'proveedores_off' });
    const m = await PostalMime.parse(await request.arrayBuffer());
    const { repo, subir } = proveedoresDeps(env);
    const r = await procesarEntrante({
        messageId: m.messageId ?? `sin-id-${Date.now()}`,
        fecha: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
        de: m.from?.address ?? '',
        para: direcciones(m.to),
        cc: direcciones(m.cc),
        asunto: m.subject ?? '',
        texto: m.text ?? '',
        adjuntos: (m.attachments ?? []).map((a) => ({
            nombre: a.filename ?? 'adjunto',
            tipo: a.mimeType ?? 'application/octet-stream',
            contenido: typeof a.content === 'string' ? new TextEncoder().encode(a.content) : new Uint8Array(a.content),
        })),
    }, { repo, subir, log: console.log });
    return NextResponse.json({ success: true, ...r });
}
