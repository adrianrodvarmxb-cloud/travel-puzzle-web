import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import { isHelpVisible } from '@/help/lib/faq';

/** Marco común del blog: menú, fondo oscuro, pie y burbuja (mismo look and feel del sitio). */
export function BlogShell({ children }: { children: React.ReactNode }) {
  const env = process.env as Record<string, string | undefined>;
  const contact = contactFromEnv(env);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="tp-dark">{children}</main>
      <SiteFooter contact={{ whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials }} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
