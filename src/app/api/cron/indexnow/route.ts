import { NextResponse } from 'next/server';
import { runIndexNow } from '@/seo/indexnow-run';
import { sitemapFiles } from '@/destinations/sitemaps';
import { siteUrl } from '@/destinations/server';

export const dynamic = 'force-dynamic';

/**
 * REQ-586: avisa a IndexNow (Bing y demás) de las URLs que cambiaron desde ayer, según el lastmod de los sitemaps.
 * La llama el cron del Worker una vez al día. Tras INDEXNOW_ENABLED="false": apagada responde «skipped».
 */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const r = await runIndexNow({ env: process.env as Record<string, string | undefined>, siteUrl: siteUrl(), now: new Date(), getFiles: sitemapFiles, fetch });
    return NextResponse.json({ success: true, ...r });
}
