import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestPasswordLink } from '@/trips/password';
import { passwordDeps } from '@/trips/deps';

export const dynamic = 'force-dynamic';

/** Manda el enlace para crear o cambiar la contraseña (solo si la cuenta es ADMIN; responde igual siempre). */
export async function POST(request: Request) {
    const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Escribe un correo válido' }, { status: 400 });
    await requestPasswordLink(parsed.data.email, await passwordDeps());
    return NextResponse.json({ ok: true });
}
