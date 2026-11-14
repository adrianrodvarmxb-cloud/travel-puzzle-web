'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inputCls, smallBtn } from './trips/fields';

/** Enlace de pago de Stripe de una solicitud (REQ-159, REQ-116). Solo se pinta con STRIPE_ENABLED. */
export function PaymentLinkControl({ id, hasPending, defaultAmount, defaultCurrency }: { id: string; hasPending: boolean; defaultAmount: number | null; defaultCurrency: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    async function submit(form: FormData) {
        setBusy(true);
        setMsg(null);
        const res = await fetch(`/api/admin/solicitudes/${id}/pago`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Number(form.get('amount')), currency: form.get('currency'), kind: form.get('kind') }),
        });
        const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        setBusy(false);
        setMsg(res.ok ? 'Enlace enviado al cliente (vence en 24 h).' : json.message ?? json.error ?? 'No se pudo enviar.');
        router.refresh();
    }
    return (
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }}>
            <label className="text-xs text-[#9AAEE0]">Monto
                <input name="amount" type="number" min="10" step="0.01" required defaultValue={defaultAmount ?? undefined} className={`${inputCls} mt-1 w-32`} />
            </label>
            <label className="text-xs text-[#9AAEE0]">Moneda
                <select name="currency" defaultValue={['MXN', 'USD', 'EUR'].includes(defaultCurrency) ? defaultCurrency : 'MXN'} className={`${inputCls} mt-1 w-24`}>
                    <option>MXN</option><option>USD</option><option>EUR</option>
                </select>
            </label>
            <label className="text-xs text-[#9AAEE0]">Concepto
                <select name="kind" defaultValue="total" className={`${inputCls} mt-1 w-36`}>
                    <option value="total">Pago total</option><option value="anticipo">Anticipo</option><option value="liquidacion">Liquidación</option>
                </select>
            </label>
            <button type="submit" disabled={busy} className={smallBtn}>{hasPending ? 'Reenviar enlace' : 'Enviar enlace de pago'}</button>
            <p className="w-full text-[11px] text-[#7F8DB0]">Se cobra en pesos con tarjeta. USD/EUR: FIX Banxico + colchón.</p>
            {msg && <p className="w-full text-xs text-white">{msg}</p>}
        </form>
    );
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', held: 'Retenido', paid: 'Pagado', released: 'Liberado', expired: 'Vencido', replaced: 'Reemplazado' };
const KIND_LABEL: Record<string, string> = { anticipo: 'Anticipo', liquidacion: 'Liquidación', total: 'Pago total' };

export interface PaymentItem { id: string; kind: string; amountCentavos: number; originalAmount: number; originalCurrency: string; status: string; paidAt: string | null }

/** Historial de pagos de una solicitud (REQ-119). Montos ya formateados en el servidor (INC-001). */
export function PaymentList({ items }: { items: (PaymentItem & { amountText: string })[] }) {
    if (items.length === 0) return null;
    return (
        <ul className="mt-2 space-y-1 text-xs">
            {items.map((p) => (
                <li key={p.id} className="font-data text-[#A9B6D6]">
                    {KIND_LABEL[p.kind] ?? p.kind} · {p.amountText}{p.originalCurrency !== 'MXN' ? ` (${p.originalCurrency} ${p.originalAmount})` : ''} · <span className={p.status === 'paid' ? 'text-[#7CE3A1]' : ''}>{STATUS_LABEL[p.status] ?? p.status}</span>{p.paidAt ? ` · ${p.paidAt}` : ''}
                </li>
            ))}
        </ul>
    );
}

/** Cobrar o liberar una tarjeta retenida (REQ-3483). Solo se pinta con STRIPE_HOLD_ENABLED y un pago «held». Pide confirmación en dos pasos. */
export function HoldControl({ id, amountText }: { id: string; amountText: string }) {
    const router = useRouter();
    const [ask, setAsk] = useState<'capture' | 'release' | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    async function run(action: 'capture' | 'release') {
        setBusy(true);
        setMsg(null);
        const res = await fetch(`/api/admin/solicitudes/${id}/retencion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
        const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        setBusy(false);
        setAsk(null);
        setMsg(res.ok ? (action === 'capture' ? 'Cobrado.' : 'Retención liberada.') : json.message ?? json.error ?? 'No se pudo completar.');
        router.refresh();
    }
    return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
            {ask === null ? (
                <>
                    <button type="button" disabled={busy} className={smallBtn} onClick={() => setAsk('capture')}>Cobrar retención</button>
                    <button type="button" disabled={busy} className={smallBtn} onClick={() => setAsk('release')}>Liberar retención</button>
                </>
            ) : (
                <>
                    <span className="text-xs text-white">{ask === 'capture' ? `¿Cobrar ${amountText} a la tarjeta?` : '¿Liberar la tarjeta sin cargo?'}</span>
                    <button type="button" disabled={busy} className={smallBtn} onClick={() => run(ask)}>Sí, confirmar</button>
                    <button type="button" disabled={busy} className={smallBtn} onClick={() => setAsk(null)}>Cancelar</button>
                </>
            )}
            {msg && <p className="w-full text-xs text-white">{msg}</p>}
        </div>
    );
}
