import { NextResponse } from 'next/server';
import { uploadTripImage } from '@/trips/images';
import { requireAdmin, tripImagesBucket } from '@/trips/deps';

export const dynamic = 'force-dynamic';

/** Sube una foto de viaje a R2. Solo ADMIN. */
export async function POST(request: Request) {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const file = (await request.formData().catch(() => null))?.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });
    const bucket = tripImagesBucket();
    const r = await uploadTripImage(file, {
        put: bucket ? (key, body, contentType) => bucket.put(key, body, { httpMetadata: { contentType } }) : null,
        now: Date.now,
        random: () => crypto.randomUUID().replace(/-/g, '').slice(0, 10),
    });
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}
