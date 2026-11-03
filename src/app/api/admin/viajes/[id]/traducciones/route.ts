import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TARGET_LANGS, setManual, sourceStrings } from '@/trips/lib/translation';
import { requireAdmin, translationDeps } from '@/trips/deps';

export const dynamic = 'force-dynamic';

/** Corrige a mano una traducción (queda con candado). Texto vacío = vuelve a automática. Solo ADMIN. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const parsed = z.object({ lang: z.enum(TARGET_LANGS), key: z.string().min(1).max(80), text: z.string().max(8000) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    const id = (await params).id;
    const d = await translationDeps();
    const data = await d.load(id);
    if (!data) return NextResponse.json({ error: 'No encontramos ese viaje' }, { status: 404 });
    const source = sourceStrings(data.trip);
    if (!(parsed.data.key in source)) return NextResponse.json({ error: 'Ese texto ya no existe en español' }, { status: 400 });
    await d.save(id, setManual(data.translations, parsed.data.lang, parsed.data.key, parsed.data.text, source[parsed.data.key]));
    return NextResponse.json({ ok: true });
}
