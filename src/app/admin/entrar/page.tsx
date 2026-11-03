import type { Metadata } from 'next';
import { AdminSignIn } from '@/components/admin/AdminSignIn';

export const metadata: Metadata = { title: 'Entrar · Gestor', robots: { index: false, follow: false } };

/** Entrada del equipo al gestor (independiente de las cuentas de clientes, que siguen apagadas). */
export default async function AdminSignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
    const cb = (await searchParams).callbackUrl ?? '/admin/viajes';
    const callbackUrl = cb.startsWith('/admin/') ? cb : '/admin/viajes';
    return (
        <main className="tp-dark min-h-screen">
            <section className="mx-auto w-full max-w-sm px-4 py-20">
                <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · INTERNO</p>
                <h1 className="font-display text-3xl font-bold text-white">Entrar al gestor</h1>
                <p className="mt-2 text-sm text-[#A9B6D6]">Solo cuentas del equipo autorizadas.</p>
                <AdminSignIn callbackUrl={callbackUrl} />
            </section>
        </main>
    );
}
