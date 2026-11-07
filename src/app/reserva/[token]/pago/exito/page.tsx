import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout';
import { confirmPayment } from '@/booking/payment';
import { paymentDeps } from '@/booking/payment-deps';
import { getPreferredLanguage } from '@/lib/utils/cookies';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pago · Travel Puzzle', robots: { index: false, follow: false } };

const T = {
    es: { paid: ['¡Pago confirmado!', 'Tu reserva quedó lista. Te mandamos la confirmación por correo.'], pending: ['Estamos confirmando tu pago', 'Puede tardar unos minutos. Te avisamos por correo en cuanto quede confirmado.'], other: ['No pudimos confirmar el pago', 'Escríbenos por WhatsApp y lo revisamos contigo.'], cta: 'Ver mi reserva' },
    en: { paid: ['Payment confirmed!', 'Your booking is ready. We sent the confirmation to your email.'], pending: ['Confirming your payment', 'It may take a few minutes. We will email you as soon as it is confirmed.'], other: ['We could not confirm the payment', 'Message us on WhatsApp and we will check it with you.'], cta: 'View my booking' },
};

/** REQ-012: regreso del checkout de Freetour: se verifica el pago antes de confirmar. */
export default async function PaymentSuccessPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const lang = (await getPreferredLanguage()) === 'es' ? 'es' : 'en';
    const outcome = process.env.PAID_TOURS_ENABLED === 'true' ? await confirmPayment(token, paymentDeps(lang)).catch(() => 'pending' as const) : 'not_found';
    const t = T[lang];
    const [title, text] = outcome === 'paid' ? t.paid : outcome === 'pending' ? t.pending : t.other;
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark min-h-[70vh]">
                <section className="mx-auto max-w-xl px-4 py-20 text-center">
                    <p className="text-5xl" aria-hidden>{outcome === 'paid' ? '🎉' : '⏳'}</p>
                    <h1 className="font-display mt-4 text-3xl font-bold text-white">{title}</h1>
                    <p className="mt-3 text-lg text-[#D5DCEE]">{text}</p>
                    <Link href={`/reserva/${encodeURIComponent(token)}`} className="mt-8 inline-flex rounded-xl bg-[#C12909] px-6 py-3 font-semibold text-white">{t.cta} →</Link>
                </section>
            </main>
        </div>
    );
}
