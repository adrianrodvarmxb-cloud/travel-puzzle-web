import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setPasswordWithLink } from '@/trips/password';
import { passwordDeps } from '@/trips/deps';

export const dynamic = 'force-dynamic';

const schema = z.object({
    email: z.string().trim().email().max(254),
    exp: z.number().int(),
    sig: z.string().min(10).max(200),
    password: z.string().max(200),
    confirm: z.string().max(200),
});

/** Guarda la contraseña nueva con el enlace firmado del correo. */
export async function POST(request: Request) {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    const r = await setPasswordWithLink(parsed.data, await passwordDeps());
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
}
