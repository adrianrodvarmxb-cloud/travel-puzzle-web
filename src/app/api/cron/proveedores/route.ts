import { NextResponse } from 'next/server';
import { proveedoresDeps, proveedoresEncendido } from '@/proveedores/deps';
import { revisionDiaria } from '@/proveedores/diario';
import { mandarResumen } from '@/proveedores/resumen';
import { esHoraResumen } from '@/proveedores/lib/resumen';
import { tarifaDeps } from '@/proveedores/deps';
import { aplicarVigentes } from '@/proveedores/tarifa';

export const dynamic = 'force-dynamic';

/** REQ-1293, REQ-1566: revisión de Mila con los proveedores. La llama el cron del Worker cada hora; cada proveedor, en su horario. */
export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const env = process.env as Record<string, string | undefined>;
    if (!proveedoresEncendido(env)) return NextResponse.json({ success: true, skipped: 'proveedores_off' });
    const { repo, enviar, avisar, destinos, contacto } = proveedoresDeps(env);
    const hoy = new Date().toISOString();
    const reporte = await revisionDiaria({ repo, enviar, hoy, log: console.log, contacto }) /* REQ-3430 */;
    // REQ-1568: lunes 9:00 de México, el resumen semanal (solo con el puente de avisos configurado).
    const resumen = esHoraResumen(hoy) && env.MILA_AVISOS_URL ? await mandarResumen({ repo, avisar, destinos, hoy }) : null;
    // REQ-1672: los cambios de tarifa confirmados cuya fecha ya llegó pasan al precio de la página.
    const tarifas = await aplicarVigentes(tarifaDeps(env, hoy));
    return NextResponse.json({ success: true, ...reporte, resumen, tarifas });
}
