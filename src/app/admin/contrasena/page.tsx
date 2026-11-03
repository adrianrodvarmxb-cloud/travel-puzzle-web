import type { Metadata } from 'next';
import { SetPasswordForm } from '@/components/admin/SetPasswordForm';

export const metadata: Metadata = { title: 'Contraseña · Gestor', robots: { index: false, follow: false }, referrer: 'no-referrer' };

/** Crear o cambiar la contraseña del gestor con el enlace del correo. */
export default async function AdminPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const q = await searchParams;
    return (
        <main className="tp-dark min-h-screen">
            <section className="mx-auto w-full max-w-sm px-4 py-20">
                <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · INTERNO</p>
                <h1 className="font-display text-3xl font-bold text-white">Tu contraseña</h1>
                {q.email && q.exp && q.sig ? (
                    <SetPasswordForm email={q.email} exp={Number(q.exp)} sig={q.sig} />
                ) : (
                    <p className="mt-6 text-sm text-[#A9B6D6]">Abre esta página desde el enlace del correo. Puedes pedir uno en la entrada del gestor.</p>
                )}
            </section>
        </main>
    );
}
