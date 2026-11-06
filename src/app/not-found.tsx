import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { SiteFooter } from '@/components/home/v2/SiteFooter';
import { contactFromEnv } from '@/booking/tour-summary';
import { isHelpVisible } from '@/help/lib/faq';

const TEXT = {
    es: { title: 'No encontramos esta página', body: 'Puede que el enlace esté incompleto o que la página ya no exista. Si buscas tu reserva, abre el enlace del correo de confirmación.', home: 'Ir al inicio', tours: 'Ver experiencias', help: '¿Necesitas ayuda? Escríbenos por WhatsApp' },
    en: { title: "We couldn't find this page", body: "The link may be incomplete or the page may no longer exist. If you're looking for your booking, open the link in your confirmation email.", home: 'Go to home', tours: 'See experiences', help: 'Need help? Message us on WhatsApp' },
};

export default async function NotFound() {
    const lang = (await getPreferredLanguage()) === 'es' ? 'es' : 'en';
    const t = TEXT[lang];
    const wa = process.env.WHATSAPP_NUMBER?.replace(/\D/g, '');
    // REQ-304: el mismo pie del home que el resto del sitio.
    const env = process.env as Record<string, string | undefined>;
    const contact = contactFromEnv(env);
    return (
        <div className="min-h-screen bg-background relative">
            <Navbar />
            <div
                className="relative min-h-[calc(100vh-64px)] flex justify-center pt-16"
                style={{ backgroundImage: 'url(/404-background.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
            >
                <div className="relative z-10 mx-4 h-fit max-w-md rounded-2xl bg-[#0A1330]/85 px-6 py-8 text-center text-white backdrop-blur">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#9AAEE0]">404</p>
                    <h1 className="mt-2 text-2xl font-bold leading-tight">{t.title}</h1>
                    <p className="mt-3 text-sm text-[#C9D6F5]">{t.body}</p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Link href="/" className="rounded-xl bg-[#C12909] px-5 py-3 font-bold text-white">{t.home} →</Link>
                        <Link href="/tours" className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white">{t.tours}</Link>
                    </div>
                    {wa && (
                        <a href={`https://wa.me/${wa}`} className="mt-5 inline-flex items-center gap-2 text-sm text-[#C9D6F5] hover:text-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/brand/social/whatsapp.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
                            {t.help}
                        </a>
                    )}
                </div>
            </div>
            <SiteFooter contact={{ whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO || undefined, socials: contact.socials }} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
        </div>
    );
}
