import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/trips/deps';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gestor de viajes', robots: { index: false, follow: false } };

/** Gestor de viajes propios y de agencias: solo cuentas ADMIN (gate B). */
export default async function TripsAdminLayout({ children }: { children: ReactNode }) {
    if (!(await requireAdmin())) redirect('/admin/entrar?callbackUrl=/admin/viajes');
    return (
        <main className="tp-dark min-h-screen">
            <section className="mx-auto w-full max-w-4xl px-4 py-12">
                <nav className="font-data mb-2.5 flex gap-4 text-xs uppercase tracking-[0.3em] text-[#008DFF]">
                    <Link href="/admin/viajes" className="text-white">TRAVEL PUZZLE · GESTOR DE VIAJES</Link><Link href="/admin/solicitudes">Solicitudes</Link>
                </nav>
                {children}
            </section>
        </main>
    );
}
