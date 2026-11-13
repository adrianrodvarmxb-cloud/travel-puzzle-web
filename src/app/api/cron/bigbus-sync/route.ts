import { NextResponse } from 'next/server';
import { catalogSyncDeps } from '@/octo/deps';
import { runBigBusCatalogSync } from '@/octo/catalog-sync';

export const dynamic = 'force-dynamic';

/** REQ-3416: catálogo diario de Big Bus por OCTO (lo llama el cron del Worker). Con la bandera apagada no hace nada. */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await runBigBusCatalogSync(catalogSyncDeps(new Date()));
    return NextResponse.json(result, { status: result.status === 'error' ? 502 : 200 });
}
