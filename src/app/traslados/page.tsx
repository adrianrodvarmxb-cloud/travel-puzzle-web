import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import { TransfersWidget } from '@/components/transfers/TransfersWidget';
import { isTransfersVisible, transfersWidgetUrl } from '@/transfers/lib/widget';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Traslados del aeropuerto a tu hotel',
  description: 'Reserva tu traslado privado del aeropuerto a tu hotel en cientos de ciudades del mundo.',
  alternates: { canonical: '/traslados' },
};

/** REQ-028: visible solo con TRANSFERS_ENABLED="true". */
export default function TrasladosPage() {
  const env = process.env as Record<string, string | undefined>;
  if (!isTransfersVisible(env.TRANSFERS_ENABLED)) notFound();
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="tp-dark">
        <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Traslados</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Del aeropuerto a tu hotel, sin preocupaciones</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Elige tu aeropuerto o estación, tu hotel y la fecha. Te esperamos con tu nombre a la llegada.
            Precios en dólares (USD).
          </p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white p-3 md:p-5">
            <TransfersWidget src={transfersWidgetUrl('es')} />
          </div>
        </section>
      </main>
      <SiteFooter contact={footer} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
