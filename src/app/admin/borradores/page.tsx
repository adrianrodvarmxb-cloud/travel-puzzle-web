import { getPrisma } from '@/lib/prisma';
import { createBorradoresRepo } from '@/proveedores/borrador-repo';
import { dbDePrisma } from '@/proveedores/repository';
import { borradoresEncendido, proveedoresEncendido } from '@/proveedores/deps';
import { BorradorControl } from '@/components/admin/BorradorControl';

const ETIQUETA: Record<string, string> = { programado: 'Programado', enviado: 'Enviado', cancelado: 'Cancelado', vencido: 'Vencido sin enviar', error: 'Error al enviar' };
const hora = (iso: string) => new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

/** REQ-10693: bandeja de borradores programados a proveedores. Nada sale sin pasar por aquí; el PO cancela, edita o manda ya. */
export default async function BorradoresPage() {
    const env = process.env as Record<string, string | undefined>;
    if (!proveedoresEncendido(env)) return <p className="text-[#A9B6D6]">Proveedores de Mila está apagado (PROVEEDORES_MILA_ON).</p>;
    if (!borradoresEncendido(env)) return <p className="text-[#A9B6D6]">La bandeja de borradores está apagada (PROVEEDORES_BORRADORES_ON): Mila no manda ningún correo a proveedores.</p>;
    const repo = createBorradoresRepo(dbDePrisma(getPrisma() as never));
    const filas = await repo.porEstado(['programado', 'vencido', 'error', 'enviado', 'cancelado'], 100);
    const nombres = new Map((await getPrisma().$queryRawUnsafe<{ id: string; nombre: string }[]>(`SELECT "id","nombre" FROM "Proveedor"`)).map((p) => [p.id, p.nombre]));
    const orden = { programado: 0, vencido: 1, error: 2, enviado: 3, cancelado: 4 } as Record<string, number>;
    filas.sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || a.enviarEn.localeCompare(b.enviarEn));
    return (
        <>
            <h1 className="font-display text-4xl font-bold text-white">Borradores a proveedores</h1>
            <p className="mt-2 text-sm text-[#A9B6D6]">Cada correo de Mila a un proveedor espera aquí hasta su hora (5:00–16:00 del proveedor). Cancélalo, edítalo o mándalo ya.</p>
            <ul className="mt-8 space-y-4">
                {filas.length === 0 && <li className="text-[#A9B6D6]">No hay borradores.</li>}
                {filas.map((b) => (
                    <li key={b.id} id={b.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[#D5DCEE]">
                        <span className="font-data text-[11px] uppercase tracking-wider text-[#9AAEE0]">{ETIQUETA[b.estado] ?? b.estado} · {b.tipo} · sale {hora(b.enviarEn)} (CDMX)</span>
                        <p className="mt-2 font-semibold text-white">{nombres.get(b.proveedorId) ?? b.proveedorId} · {b.para.join(', ')}</p>
                        <p className="text-xs text-[#9AAEE0]">cc {b.cc.join(', ')}{b.inReplyTo ? ' · responde en el hilo' : ''}</p>
                        {b.nota && <p className="mt-1 text-[#FFCF70]">{b.nota}</p>}
                        {b.estado === 'programado'
                            ? <BorradorControl id={b.id} asunto={b.asunto} texto={b.texto} enviarEn={b.enviarEn} />
                            : <details className="mt-2"><summary className="cursor-pointer text-xs text-[#9AAEE0]">{b.asunto}</summary><p className="mt-1 whitespace-pre-wrap text-xs">{b.texto}</p></details>}
                    </li>
                ))}
            </ul>
        </>
    );
}
