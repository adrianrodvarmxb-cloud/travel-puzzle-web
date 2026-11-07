import { NextResponse } from 'next/server';
import { proveedoresDeps, proveedoresEncendido } from '@/proveedores/deps';
import { revisionDiaria } from '@/proveedores/diario';

export const dynamic = 'force-dynamic';

/** REQ-1293: revisión diaria de Mila con los proveedores. La llama el cron del Worker una vez al día. */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const env = process.env as Record<string, string | undefined>;
    if (!proveedoresEncendido(env)) return NextResponse.json({ success: true, skipped: 'proveedores_off' });
    const { repo, enviar } = proveedoresDeps(env);
    const reporte = await revisionDiaria({ repo, enviar, hoy: new Date().toISOString(), log: console.log });
    return NextResponse.json({ success: true, ...reporte });
}
