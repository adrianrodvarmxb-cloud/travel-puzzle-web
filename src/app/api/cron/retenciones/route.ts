import { NextResponse } from 'next/server';
import { runHoldSweep } from '@/payments/hold-sweep';
import { sweepDeps } from '@/payments/deps';

export const dynamic = 'force-dynamic';

/** REQ-3484: aviso del día 5 y liberación de retenciones vencidas. La llama el cron del Worker cada hora. Apagada (STRIPE_HOLD_ENABLED) responde «skipped». */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const summary = await runHoldSweep(sweepDeps());
    console.log('[retenciones]', JSON.stringify(summary));
    return NextResponse.json({ success: true, ...summary });
}
