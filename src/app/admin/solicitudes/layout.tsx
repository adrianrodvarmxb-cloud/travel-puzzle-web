import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/trips/deps';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Solicitudes', robots: { index: false, follow: false } };

export default async function RequestsLayout({ children }: { children: ReactNode }) {
    if (!(await requireAdmin())) redirect('/admin/entrar?callbackUrl=/admin/solicitudes');
    return (
        <main className="tp-dark min-h-screen">
            <section className="mx-auto w-full max-w-4xl px-4 py-12">
                <nav className="font-data mb-2.5 flex gap-4 text-xs uppercase tracking-[0.3em] text-[#008DFF]">
                    <Link href="/admin/viajes">Viajes</Link><Link href="/admin/solicitudes" className="text-white">Solicitudes</Link>
                </nav>
                {children}
            </section>
        </main>
    );
}
