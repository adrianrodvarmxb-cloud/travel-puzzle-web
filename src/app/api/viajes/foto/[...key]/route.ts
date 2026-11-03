import { IMAGE_KEY_RE } from '@/trips/lib/image';
import { tripImagesBucket } from '@/trips/deps';

/** Sirve una foto de viaje desde R2 (solo llaves generadas por el gestor). */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
    const key = (await params).key.join('/');
    if (!IMAGE_KEY_RE.test(key)) return new Response('No encontrada', { status: 404 });
    const obj = await tripImagesBucket()?.get(key);
    if (!obj) return new Response('No encontrada', { status: 404 });
    return new Response(obj.body, {
        headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
}
