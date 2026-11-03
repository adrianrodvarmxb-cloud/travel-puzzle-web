import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TARGET_LANGS } from '@/trips/lib/translation';
import { translateTripLang } from '@/trips/translate';
import { requireAdmin, translationDeps } from '@/trips/deps';

export const dynamic = 'force-dynamic';

/** Traduce el viaje a un idioma (lo pendiente; respeta lo editado a mano). Solo ADMIN. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = z.object({ lang: z.enum(TARGET_LANGS) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Idioma inválido' }, { status: 400 });
    const r = await translateTripLang((await params).id, parsed.data.lang, await translationDeps());
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
