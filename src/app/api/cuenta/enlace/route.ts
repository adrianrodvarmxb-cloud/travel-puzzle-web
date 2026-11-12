import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestLoginLink } from '@/accounts/login';
import { loginDeps } from '@/accounts/deps';
import { ACCOUNTS_ENABLED } from '@/lib/features';

export const dynamic = 'force-dynamic';

/** REQ-1599: manda el enlace para entrar. Responde igual exista o no la cuenta. */
export async function POST(request: Request) {
    if (!ACCOUNTS_ENABLED) return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Escribe un correo válido' }, { status: 400 });
    await requestLoginLink(parsed.data.email, await loginDeps());
    return NextResponse.json({ ok: true });
}
