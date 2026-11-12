import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AccountSettings } from '@/components/account/AccountSettings';
import { getPrisma } from '@/lib/prisma';

import { Navbar } from '@/components/layout/Navbar';

export const dynamic = 'force-dynamic';

/** REQ-1594: datos de la cuenta. */
export default async function AccountPage() {
    const session = await auth().catch(() => null);
    const email = session?.user?.email;
    if (!email) redirect('/mi-cuenta/entrar');
    const user = session?.user?.id ? await getPrisma().user.findUnique({ where: { id: session.user.id }, select: { name: true } }).catch(() => null) : null;
    return (
        <>
            <Navbar />
            <main className="tp-dark min-h-screen">
                <section className="mx-auto w-full max-w-2xl px-4 py-16">
                <div className="mx-auto max-w-sm">
                    <nav className="font-data mb-2.5 flex gap-4 text-xs uppercase tracking-[0.3em] text-[#008DFF]">
                        <Link href="/mi-cuenta/reservas">Mis reservas</Link><span className="text-white">Mi cuenta</span>
                    </nav>
                    <h1 className="font-display text-3xl font-bold text-white">Mi cuenta</h1>
                    <AccountSettings name={user?.name ?? session?.user?.name ?? null} email={email} />
                </div>
                </section>
            </main>
        </>
    );
}
