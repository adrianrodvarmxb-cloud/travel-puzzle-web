import { getPrisma } from '@/lib/prisma';
import { createTarifasRepo } from '@/proveedores/tarifa-repo';
import { dbDePrisma } from '@/proveedores/repository';
import { codigoAviso } from '@/proveedores/lib/tarifas';
import { proveedoresEncendido } from '@/proveedores/deps';
import { TarifaAvisoControl } from '@/components/admin/TarifaAvisoControl';

const ETIQUETA: Record<string, string> = { por_confirmar: 'Por confirmar', falta_fecha: 'Mila pidió la fecha', falta_monto: 'Sin monto claro', confirmado: 'Confirmado (cambia el día que rige)' };

/** REQ-1579, REQ-1580: cambios de tarifa avisados por proveedores. Nada cambia hasta que el PO confirma. */
export default async function TarifasPage() {
    if (!proveedoresEncendido(process.env as Record<string, string | undefined>)) {
        return <p className="text-[#A9B6D6]">Proveedores de Mila está apagado (PROVEEDORES_MILA_ON).</p>;
    }
    const repo = createTarifasRepo(dbDePrisma(getPrisma() as never));
    const avisos = await repo.avisos(['por_confirmar', 'falta_fecha', 'falta_monto', 'confirmado']);
    const nombres = new Map((await getPrisma().$queryRawUnsafe<{ id: string; nombre: string }[]>(`SELECT "id","nombre" FROM "Proveedor"`)).map((p) => [p.id, p.nombre]));
    const anexos = new Map<string, { id: string; producto: string }[]>();
    for (const a of avisos) if (!anexos.has(a.proveedorId)) anexos.set(a.proveedorId, (await repo.anexo(a.proveedorId)).map((r) => ({ id: r.id, producto: r.producto })));
    return (
        <>
            <h1 className="font-display text-4xl font-bold text-white">Tarifas</h1>
            <ul className="mt-8 space-y-4">
                {avisos.length === 0 && <li className="text-[#A9B6D6]">No hay cambios de tarifa pendientes.</li>}
                {avisos.map((a) => {
                    const producto = anexos.get(a.proveedorId)?.find((r) => r.id === a.tarifaId)?.producto;
                    return (
                        <li key={a.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[#D5DCEE]">
                            <span className="font-data text-[11px] uppercase tracking-wider text-[#9AAEE0]">{codigoAviso(a.numero)} · {ETIQUETA[a.estado] ?? a.estado}</span>
                            <p className="mt-2 font-semibold text-white">{nombres.get(a.proveedorId) ?? a.proveedorId} · {producto ?? 'Producto sin identificar'}</p>
                            <p>Neto {a.netoAntes != null ? `${a.netoAntes} → ` : ''}{a.netoNuevo ?? '¿?'} {a.moneda ?? ''} · desde {a.desde ?? 'sin fecha'}</p>
                            {a.nota && <p className="mt-1 text-[#FFCF70]">{a.nota}</p>}
                            <details className="mt-2"><summary className="cursor-pointer text-xs text-[#9AAEE0]">Correo del proveedor</summary><p className="mt-1 whitespace-pre-wrap text-xs">{a.asunto}{'\n'}{a.texto.slice(0, 1200)}</p></details>
                            {a.estado !== 'confirmado' && (
                                <TarifaAvisoControl id={a.id} puedeConfirmar={a.estado === 'por_confirmar'} renglones={a.tarifaId ? undefined : anexos.get(a.proveedorId)} />
                            )}
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
