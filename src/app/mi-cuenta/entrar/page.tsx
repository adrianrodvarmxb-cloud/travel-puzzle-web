import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AccountSignIn } from '@/components/account/AccountSignIn';

import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

/** REQ-1599: entrada de clientes (enlace al correo o Google). */
export default async function AccountSignInPage() {
    const session = await auth().catch(() => null);
    if (session?.user) redirect('/mi-cuenta/reservas');
    return (
        <>
            <Navbar />
            <main className="tp-dark min-h-screen">
                <section className="mx-auto w-full max-w-2xl px-4 py-16">
                <div className="mx-auto max-w-sm">
                    <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · MI CUENTA</p>
                    <h1 className="font-display text-3xl font-bold text-white">Entra a tu cuenta</h1>
                    <p className="mt-2 text-sm text-[#A9B6D6]">Ve todas tus reservas en un solo lugar. No necesitas cuenta para reservar.</p>
                    <AccountSignIn />
                </div>
                </section>
            </main>
        </>
    );
}
