import Link from 'next/link';
import { getPrisma } from '@/lib/prisma';
import { REQUEST_STATUSES, REQUEST_STATUS_LABEL, type RequestStatus } from '@/trips/lib/request';
import { formatMoney } from '@/trips/lib/money';
import { RequestStatusControl } from '@/components/admin/RequestStatusControl';
import { PaymentLinkControl, PaymentList, HoldControl } from '@/components/admin/PaymentLinkControl';
import { isHoldEnabled } from '@/payments/lib/hold';
import { stripeEnabled, listPayments } from '@/payments/deps';
import { formatMXN } from '@/payments/lib/email';

/** Panel de solicitudes de cotización (gate M). */
export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
    const q = await searchParams;
    const estado = (REQUEST_STATUSES as readonly string[]).includes(q.estado ?? '') ? (q.estado as RequestStatus) : null;
    const rows = await getPrisma().tripRequest.findMany({ where: estado ? { status: estado } : {}, orderBy: { createdAt: 'desc' }, take: 200 });
    // REQ-118: sin STRIPE_ENABLED no se consulta ni se pinta nada de pagos.
    const payOn = stripeEnabled();
    const payments = payOn ? await listPayments(rows.map((r) => r.id)) : [];
    return (
        <>
            <h1 className="font-display text-4xl font-bold text-white">Solicitudes</h1>
            <nav className="mt-6 flex flex-wrap gap-2">
                {[null, ...REQUEST_STATUSES].map((s) => (
                    <Link key={s ?? 'todas'} href={s ? `?estado=${s}` : '?'} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${s === estado ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white'}`}>
                        {s ? REQUEST_STATUS_LABEL[s] : 'Todas'}
                    </Link>
                ))}
            </nav>
            <ul className="mt-8 space-y-4">
                {rows.length === 0 && <li className="text-[#A9B6D6]">No hay solicitudes en esta vista.</li>}
                {rows.map((r) => {
                    const wa = `https://wa.me/${r.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${r.firstName}, te escribimos de Travel Puzzle por tu solicitud ${r.ref} (${r.tripTitle}).`)}`;
                    return (
                        <li key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[#D5DCEE]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-data text-[11px] uppercase tracking-wider text-[#9AAEE0]">{r.ref} · {r.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC</span>
                                <RequestStatusControl id={r.id} status={r.status} notes={r.notes} />
                            </div>
                            <p className="mt-2 font-semibold text-white">{r.tripTitle} <span className="font-data text-[11px] text-[#7F8DB0]">{r.tripCode}</span></p>
                            <p>{r.kind === 'personalizado' ? `Personalizado · ${r.date} → ${r.endDate} · ${r.serviceType === 'private' ? 'Privado' : 'En grupo'}` : `${r.date}${r.time ? ` · ${r.time}` : ''}${r.optionName ? ` · ${r.optionName}` : ''}`}</p>
                            <p>{r.adults} adultos{r.children ? ` · ${r.children} niños (${(r.childAges as number[]).join(', ')})` : ''}{r.infants ? ` · ${r.infants} infantes` : ''}{r.estimate !== null ? ` · Estimado ${formatMoney(r.estimate, r.currency as 'MXN', 'es')}` : ''}</p>
                            <p className="mt-1">{r.firstName} {r.lastName} · <a href={`mailto:${r.email}`} className="underline">{r.email}</a> · <a href={wa} target="_blank" rel="noopener" className="underline">{r.phone} (WhatsApp)</a></p>
                            {r.hotel && <p>Hotel: {r.hotel}</p>}
                            {r.comments && <p className="mt-1 whitespace-pre-line text-[#A9B6D6]">“{r.comments}”</p>}
                            {payOn && (() => {
                                const mine = payments.filter((p) => p.requestId === r.id);
                                return (
                                    <>
                                        <PaymentList items={mine.map((p) => ({ ...p, amountText: formatMXN(p.amountCentavos), paidAt: p.paidAt ? p.paidAt.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : null }))} />
                                        {isHoldEnabled(process.env.STRIPE_HOLD_ENABLED) && mine.some((p) => p.status === 'held') && (
                                            <HoldControl id={r.id} amountText={formatMXN(mine.find((p) => p.status === 'held')!.amountCentavos)} />
                                        )}
                                        {r.status !== 'paid' && r.status !== 'closed' && (
                                            <PaymentLinkControl id={r.id} hasPending={mine.some((p) => p.status === 'pending')} defaultAmount={r.estimate} defaultCurrency={r.currency} />
                                        )}
                                    </>
                                );
                            })()}
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
