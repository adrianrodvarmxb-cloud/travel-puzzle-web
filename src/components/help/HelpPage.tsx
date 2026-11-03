import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import { HelpSearch } from './HelpSearch';

/** Página del centro de ayuda (mismo marco que las páginas legales). */
export function HelpPage() {
  const env = process.env as Record<string, string | undefined>;
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="tp-dark">
        <HelpSearch whatsapp={contact.whatsapp} />
      </main>
      <SiteFooter contact={footer} helpEnabled />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
