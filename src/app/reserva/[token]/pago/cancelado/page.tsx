import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout';
import { paymentDeps } from '@/booking/payment-deps';
import { getPreferredLanguage } from '@/lib/utils/cookies';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pago · Travel Puzzle', robots: { index: false, follow: false } };

/**
 * REQ-011: el cliente salió del checkout sin pagar. REQ-931: «Intentar otra vez» pasa por /pago/continuar, que reutiliza
 * el enlace vigente o genera uno nuevo si venció hace poco; si ya se canceló por falta de pago, se dice (REQ-932).
 */
export default async function PaymentCanceledPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ estado?: string }> }) {
    const { token } = await params;
    const estado = (await searchParams).estado;
    const lang = (await getPreferredLanguage()) === 'es' ? 'es' : 'en';
    const row = process.env.PAID_TOURS_ENABLED === 'true' ? await paymentDeps(lang).repo.findByToken(token).catch(() => null) : null;
    const expired = estado === 'vencido' || row?.paymentStatus === 'expired' || row?.status === 'canceled';
    const failed = estado === 'error';
    const retry = !expired && !failed && row?.paymentStatus === 'pending' ? `/reserva/${encodeURIComponent(token)}/pago/continuar` : null;
    const es = lang === 'es';
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark min-h-[70vh]">
                <section className="mx-auto max-w-xl px-4 py-20 text-center">
                    <h1 className="font-display text-3xl font-bold text-white">{expired ? (es ? 'Tu reserva se canceló' : 'Your booking was canceled') : es ? 'Tu pago no se completó' : 'Your payment was not completed'}</h1>
                    <p className="mt-3 text-lg text-[#D5DCEE]">{expired
                        ? (es ? 'El enlace de pago venció sin pago, así que liberamos el lugar. No se te cobró nada; puedes reservar de nuevo.' : 'The payment link expired without payment, so we released the spot. You have not been charged; you can book again.')
                        : failed
                            ? (es ? 'No pudimos generar un enlace de pago nuevo. Escríbenos por WhatsApp y lo resolvemos contigo.' : 'We could not create a new payment link. Message us on WhatsApp and we will sort it out.')
                            : (es ? 'Tu lugar sigue apartado por un tiempo limitado. Puedes intentarlo de nuevo.' : 'Your spot is held for a limited time. You can try again.')}</p>
                    {retry && <a href={retry} className="mt-8 inline-flex rounded-xl bg-[#C12909] px-6 py-3 font-semibold text-white">{es ? 'Intentar el pago otra vez' : 'Try paying again'} →</a>}
                    <p className="mt-6"><Link href="/tours" className="text-[#A9B6D6] underline">{es ? 'Ver otros tours' : 'See other tours'}</Link></p>
                </section>
            </main>
        </div>
    );
}
