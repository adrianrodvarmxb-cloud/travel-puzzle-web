import { VerifyLogin } from '@/components/account/VerifyLogin';

import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

/** REQ-1591: confirma la entrada con el enlace del correo. */
export default async function VerifyLoginPage({ searchParams }: { searchParams: Promise<{ email?: string; exp?: string; sig?: string }> }) {
    const q = await searchParams;
    const ok = !!(q.email && q.exp && q.sig);
    return (
        <>
            <Navbar />
            <main className="tp-dark min-h-screen">
                <section className="mx-auto w-full max-w-2xl px-4 py-16">
                <div className="mx-auto max-w-sm">
                    <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · MI CUENTA</p>
                    <h1 className="font-display text-3xl font-bold text-white">Entrar</h1>
                    {ok ? <VerifyLogin email={q.email!} exp={q.exp!} sig={q.sig!} /> : (
                        <p className="mt-6 text-sm text-[#D5DCEE]">El enlace está incompleto. <a href="/mi-cuenta/entrar" className="underline">Pide uno nuevo</a>.</p>
                    )}
                </div>
                </section>
            </main>
        </>
    );
}
