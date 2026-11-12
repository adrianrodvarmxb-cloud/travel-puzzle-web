import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { ACCOUNTS_ENABLED } from '@/lib/features';
import { accountNameSchema } from '@/accounts/lib/policy';
import { updateAccountName, deleteAccount } from '@/accounts/deps';

export const dynamic = 'force-dynamic';

async function sessionUserId(): Promise<string | null> {
    if (!ACCOUNTS_ENABLED) return null;
    const s = await auth().catch(() => null);
    return s?.user?.id ?? null;
}

/** REQ-1594: cambiar el nombre de la cuenta. */
export async function PATCH(request: Request) {
    const id = await sessionUserId();
    if (!id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = z.object({ name: accountNameSchema }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Escribe un nombre de 1 a 80 caracteres' }, { status: 400 });
    await updateAccountName(id, parsed.data.name);
    return NextResponse.json({ ok: true });
}

/** REQ-1594: borrar la cuenta (las reservas no se borran). */
export async function DELETE() {
    const id = await sessionUserId();
    if (!id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const ok = await deleteAccount(id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Esta cuenta no se puede borrar desde aquí' }, { status: 400 });
}
