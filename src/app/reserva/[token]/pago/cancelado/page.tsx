import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout';
import { paymentDeps } from '@/booking/payment-deps';
import { getPreferredLanguage } from '@/lib/utils/cookies';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pago · Travel Puzzle', robots: { index: false, follow: false } };

/** REQ-011: el cliente salió del checkout sin pagar; puede volver a intentarlo mientras la sesión siga vigente. */
export default async function PaymentCanceledPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const lang = (await getPreferredLanguage()) === 'es' ? 'es' : 'en';
    const row = process.env.PAID_TOURS_ENABLED === 'true' ? await paymentDeps(lang).repo.findByToken(token).catch(() => null) : null;
    const retry = row?.paymentStatus === 'pending' && row.paymentUrl && (!row.paymentExpiresAt || Date.parse(row.paymentExpiresAt) > Date.now()) ? row.paymentUrl : null;
    const es = lang === 'es';
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark min-h-[70vh]">
                <section className="mx-auto max-w-xl px-4 py-20 text-center">
                    <h1 className="font-display text-3xl font-bold text-white">{es ? 'Tu pago no se completó' : 'Your payment was not completed'}</h1>
                    <p className="mt-3 text-lg text-[#D5DCEE]">{es ? 'Tu lugar sigue apartado por un tiempo limitado. Puedes intentarlo de nuevo.' : 'Your spot is held for a limited time. You can try again.'}</p>
                    {retry && <a href={retry} className="mt-8 inline-flex rounded-xl bg-[#C12909] px-6 py-3 font-semibold text-white">{es ? 'Intentar el pago otra vez' : 'Try paying again'} →</a>}
                    <p className="mt-6"><Link href="/tours" className="text-[#A9B6D6] underline">{es ? 'Ver otros tours' : 'See other tours'}</Link></p>
                </section>
            </main>
        </div>
    );
}
