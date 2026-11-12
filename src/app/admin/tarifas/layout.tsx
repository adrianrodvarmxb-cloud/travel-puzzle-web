import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/trips/deps';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tarifas de proveedores', robots: { index: false, follow: false } };

/** REQ-1580: solo ADMIN. */
export default async function TarifasLayout({ children }: { children: ReactNode }) {
    if (!(await requireAdmin())) redirect('/admin/entrar?callbackUrl=/admin/tarifas');
    return (
        <main className="tp-dark min-h-screen">
            <section className="mx-auto w-full max-w-4xl px-4 py-12">
                <nav className="font-data mb-2.5 flex gap-4 text-xs uppercase tracking-[0.3em] text-[#008DFF]">
                    <Link href="/admin/viajes">Viajes</Link><Link href="/admin/solicitudes">Solicitudes</Link><Link href="/admin/tarifas" className="text-white">Tarifas</Link>
                </nav>
                {children}
            </section>
        </main>
    );
}
