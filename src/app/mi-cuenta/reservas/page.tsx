import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { loadAccountRows } from '@/accounts/deps';
import { accountBookings } from '@/accounts/lib/bookings';

import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

/** REQ-1593: todas las reservas hechas con el correo de la cuenta. */
export default async function MyBookingsPage() {
    const session = await auth().catch(() => null);
    const email = session?.user?.email;
    if (!email) redirect('/mi-cuenta/entrar');
    const items = accountBookings({ ...(await loadAccountRows(email)), now: new Date() });
    return (
        <>
            <Navbar />
            <main className="tp-dark min-h-screen">
                <section className="mx-auto w-full max-w-2xl px-4 py-16">
                <div>
                    <nav className="font-data mb-2.5 flex gap-4 text-xs uppercase tracking-[0.3em] text-[#008DFF]">
                        <span className="text-white">Mis reservas</span><Link href="/mi-cuenta">Mi cuenta</Link>
                    </nav>
                    <h1 className="font-display text-3xl font-bold text-white">Mis reservas</h1>
                    <p className="mt-2 text-sm text-[#A9B6D6]">Todo lo que reservaste o solicitaste con {email}.</p>
                    {items.length === 0 ? (
                        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-[#D5DCEE]">
                            <p>Aún no hay reservas con este correo.</p>
                            <Link href="/tours" className="mt-3 inline-block text-[#008DFF] underline">Ver experiencias</Link>
                        </div>
                    ) : (
                        <ul className="mt-8 space-y-3">
                            {items.map((b) => {
                                const card = (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="font-data text-[11px] uppercase tracking-wider text-[#9AAEE0]">{b.kind === 'tour' ? 'Reserva' : 'Solicitud de viaje'} · {b.ref}</span>
                                            <span className={`text-xs font-semibold ${b.upcoming ? 'text-[#7CE3A1]' : 'text-[#9AAEE0]'}`}>{b.statusLabel}</span>
                                        </div>
                                        <p className="mt-1 text-base font-semibold text-white">{b.title}</p>
                                        {b.date && <p className="mt-1 text-sm text-[#A9B6D6]">{b.date.slice(0, 10)}{b.date.length >= 16 ? ` · ${b.date.slice(11, 16)} h` : ''}</p>}
                                        {b.href && <p className="mt-2 text-sm text-[#008DFF]">Ver o gestionar →</p>}
                                    </div>
                                );
                                return <li key={`${b.kind}-${b.ref}`}>{b.href ? <Link href={b.href}>{card}</Link> : card}</li>;
                            })}
                        </ul>
                    )}
                </div>
                </section>
            </main>
        </>
    );
}
