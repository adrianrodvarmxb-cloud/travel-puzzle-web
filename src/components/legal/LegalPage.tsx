import { Navbar } from '@/components/layout';
import { SiteFooter, WhatsAppBubble } from '@/components/home/v2';
import { contactFromEnv } from '@/booking/tour-summary';
import { toBlocks } from '@/legal/lib/blocks';
import { isHelpVisible } from '@/help/lib/faq';
import { LegalDocument } from './LegalDocument';
import { SpanishOnlyNotice } from './SpanishOnlyNotice';

/** Página legal completa (header, documento y footer del sitio). Recibe el texto ya marcado; `after` va al final del documento. */
export function LegalPage({ eyebrow, title, markup, after }: { eyebrow: string; title: string; markup: string; after?: React.ReactNode }) {
  const env = process.env as Record<string, string | undefined>;
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="tp-dark">
        <LegalDocument eyebrow={eyebrow} title={title} blocks={toBlocks(markup)} notice={<SpanishOnlyNotice />} />
        {after}
      </main>
      <SiteFooter contact={footer} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
