import { NextResponse } from 'next/server';
import { contactMessageSchema } from '@/contact/schemas/message';
import { submitContact } from '@/contact/send';
import { contactDeps } from '@/contact/deps';
import { sitePagesFromEnv } from '@/site/lib/pages';

export const dynamic = 'force-dynamic';

/** REQ-247, REQ-248: formulario de /contacto. Con CONTACTO_ENABLED apagada responde 404. */
export async function POST(request: Request) {
    const env = process.env as Record<string, string | undefined>;
    const pages = sitePagesFromEnv(env);
    if (!pages.contacto) return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    const parsed = contactMessageSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message;
        return NextResponse.json({ error: msg && !msg.startsWith('Invalid') ? msg : 'Revisa los datos del formulario' }, { status: 400 });
    }
    const r = await submitContact(parsed.data, await contactDeps(env, true));
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: r.error }, { status: r.error === 'no-disponible' ? 503 : 502 });
}
