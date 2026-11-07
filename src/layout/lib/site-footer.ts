/** REQ-303: datos del pie del home (SiteFooter) a partir de las variables, para cualquier página pública. Puro. */
import { contactFromEnv } from "@/booking/tour-summary";
import { isHelpVisible } from "@/help/lib/faq";
import type { FooterContact } from "@/components/home/v2/SiteFooter";

export interface SiteFooterData {
  contact: FooterContact;
  helpEnabled: boolean;
}

export function siteFooterFromEnv(env: Record<string, string | undefined>): SiteFooterData {
  const c = contactFromEnv(env);
  return { contact: { whatsapp: c.whatsapp, email: env.EMAIL_REPLY_TO || undefined, socials: c.socials }, helpEnabled: isHelpVisible(env.BOOKINGS_ENABLED) };
}
