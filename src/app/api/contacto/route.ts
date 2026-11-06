import { NextResponse } from 'next/server';
import { inboundMessageSchema } from '@/contact/schemas/message';
import { formAllowed } from '@/contact/lib/route-gate';
import { submitContact } from '@/contact/send';
import { contactDeps } from '@/contact/deps';
import { sitePagesFromEnv } from '@/site/lib/pages';

export const dynamic = 'force-dynamic';

/** REQ-247, REQ-248, REQ-252: formularios de /contacto y /asesores, cada uno solo con su bandera (si no, 404). */
export async function POST(request: Request) {
    const env = process.env as Record<string, string | undefined>;
    const pages = sitePagesFromEnv(env);
    if (!pages.contacto && !pages.expertos) return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    const parsed = inboundMessageSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message;
        return NextResponse.json({ error: msg && !msg.startsWith('Invalid') ? msg : 'Revisa los datos del formulario' }, { status: 400 });
    }
    if (!formAllowed(parsed.data.kind, pages)) return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    const r = await submitContact(parsed.data, await contactDeps(env, true));
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: r.error }, { status: r.error === 'no-disponible' ? 503 : 502 });
}
