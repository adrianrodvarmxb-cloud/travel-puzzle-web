/**
 * JSON-LD de las páginas institucionales (REQ-245). Puro.
 * No cambia organizationJsonLd (lo usa la home tras PRIMERA_PIEZA_ENABLED): aquí se arma una versión con @id estable
 * y contactPoint, para que /nosotros y /contacto describan la misma organización. Sin domicilio de calle (D4).
 */
import { organizationJsonLd } from "./jsonld";

const CTX = "https://schema.org";
const base = (u: string) => u.replace(/\/+$/, "");

export const ORG_ID = (siteUrl: string) => `${base(siteUrl)}/#organization`;

export interface ContactInput { whatsapp?: string; email?: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Teléfono E.164 desde los dígitos de WHATSAPP_NUMBER; null si no son de 10 a 15 dígitos. */
export function e164(digits: string | undefined): string | null {
  const d = (digits ?? "").replace(/\D/g, "");
  return /^\d{10,15}$/.test(d) && d === (digits ?? "").trim() ? `+${d}` : null;
}

// REQ-245
export function organizationWithContactJsonLd(siteUrl: string, sameAs: string[], contact: ContactInput) {
  const tel = e164(contact.whatsapp);
  const email = contact.email && EMAIL.test(contact.email) ? contact.email : null;
  return {
    ...organizationJsonLd(siteUrl, sameAs),
    "@id": ORG_ID(siteUrl),
    ...(tel || email
      ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", ...(tel && { telephone: tel }), ...(email && { email }), availableLanguage: ["Spanish"] } }
      : {}),
  };
}

function webPage(type: string, siteUrl: string, path: string, name: string) {
  const url = `${base(siteUrl)}${path}`;
  return {
    "@context": CTX,
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    inLanguage: "es-MX",
    about: { "@id": ORG_ID(siteUrl) },
  };
}

// REQ-245
export const aboutPageJsonLd = (siteUrl: string, name: string) => webPage("AboutPage", siteUrl, "/nosotros", name);
