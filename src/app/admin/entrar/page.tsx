import type { Metadata } from 'next';
import { AdminSignIn } from '@/components/admin/AdminSignIn';

export const metadata: Metadata = { title: 'Entrar · Gestor', robots: { index: false, follow: false } };

/** Entrada del equipo al gestor (independiente de las cuentas de clientes, que siguen apagadas). */
export default async function AdminSignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
    const q = await searchParams;
    const cb = q.callbackUrl ?? '/admin/viajes';
    const callbackUrl = cb.startsWith('/admin/') ? cb : '/admin/viajes';
    return (
        <main className="tp-dark min-h-screen">
            <section className="mx-auto w-full max-w-sm px-4 py-20">
                <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · INTERNO</p>
                <h1 className="font-display text-3xl font-bold text-white">Entrar al gestor</h1>
                <p className="mt-2 text-sm text-[#A9B6D6]">Solo cuentas del equipo autorizadas.</p>
                {/* REQ-1532: Google rechazó un correo sin cuenta del equipo */}
                {q.error === 'sin-cuenta' && (
                    <p role="alert" className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#D5DCEE]">Ese correo de Google no tiene una cuenta del equipo. Entra con tu correo de Travel Puzzle.</p>
                )}
                <AdminSignIn callbackUrl={callbackUrl} />
            </section>
        </main>
    );
}
