import { NextResponse } from 'next/server';
import { octoApiFromEnv, planStoreFromEnv } from '@/octo/deps';
import { publicCalendar, publicCity } from '@/octo/lib/public-view';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * REQ-3423: opciones y calendario de compra directa de Big Bus para la ficha (?ref=NYC; con productId, optionId,
 * from y to trae el calendario en vivo). Sin BIGBUS_OCTO_ENABLED responde 404. Nunca devuelve el net.
 */
export async function GET(request: Request) {
    const api = octoApiFromEnv();
    if (!api) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const q = new URL(request.url).searchParams;
    const city = publicCity(await planStoreFromEnv().load().catch(() => null), q.get('ref') ?? '');
    if (!city) return NextResponse.json({ city: null }, { status: 404 });
    const productId = q.get('productId');
    const optionId = q.get('optionId');
    const from = q.get('from') ?? '';
    const to = q.get('to') ?? '';
    if (!productId || !optionId || !DATE.test(from) || !DATE.test(to)) return NextResponse.json({ city });
    const product = city.products.find((p) => p.productId === productId);
    const option = product?.options.find((o) => o.optionId === optionId);
    if (!option) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    try {
        // REQ-3436: precios en la moneda del producto en el plan (USD si Big Bus la ofrece).
        const cal = await api.availabilityCalendar({ productId, optionId, localDateStart: from, localDateEnd: to, currency: product?.currency ?? undefined });
        return NextResponse.json({ city, calendar: publicCalendar(cal.items) });
    } catch (e) {
        console.error('[bigbus-octo] calendario:', (e as Error).message);
        return NextResponse.json({ city, calendar: [] }, { status: 502 });
    }
}
