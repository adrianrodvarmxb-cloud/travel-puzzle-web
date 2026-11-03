import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, tripRepo } from '@/trips/deps';

export const dynamic = 'force-dynamic';

const agencySchema = z.object({
    name: z.string().trim().min(2).max(120),
    contactName: z.string().trim().max(120).default(''),
    email: z.union([z.literal(''), z.string().trim().email()]).default(''),
    phone: z.string().trim().max(40).default(''),
});

/** Da de alta una agencia externa. Solo ADMIN. */
export async function POST(request: Request) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = agencySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos de la agencia' }, { status: 400 });
    try {
        return NextResponse.json(await tripRepo().createAgency(parsed.data));
    } catch {
        return NextResponse.json({ error: 'Ya existe una agencia con ese nombre' }, { status: 409 });
    }
}
