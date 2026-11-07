/**
 * REQ-246: canales de contacto desde las variables (WHATSAPP_NUMBER, EMAIL_REPLY_TO). Puro.
 * El número visible se formatea aquí, en el servidor y sin Intl (INC-001). Un valor inválido se descarta.
 * No se arma enlace tel: hasta que el PO confirme que el número recibe llamadas.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ladas de 2 dígitos en México (CDMX, Guadalajara, Monterrey); el resto son de 3. */
const MX_TWO_DIGIT = new Set(["55", "33", "81"]);

// REQ-246: México con el «1» de móvil, como lo publica el PO (+52 1 55 3649 0320). Otros países: E.164 sin espacios.
export function displayPhone(digits: string): string {
  if (/^52\d{10}$/.test(digits)) {
    const n = digits.slice(2);
    return MX_TWO_DIGIT.has(n.slice(0, 2))
      ? `+52 1 ${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`
      : `+52 1 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  return `+${digits}`;
}

export interface ContactChannels {
  whatsapp: { digits: string; display: string; href: string } | null;
  email: { address: string; href: string } | null;
}

// REQ-246
export function contactChannels(env: Record<string, string | undefined>, waText: string, emailSubject: string): ContactChannels {
  const raw = (env.WHATSAPP_NUMBER ?? "").trim();
  const digits = /^\d{10,15}$/.test(raw) ? raw : null;
  const email = (env.EMAIL_REPLY_TO ?? "").trim();
  return {
    whatsapp: digits ? { digits, display: displayPhone(digits), href: `https://wa.me/${digits}?text=${encodeURIComponent(waText)}` } : null,
    email: EMAIL.test(email) ? { address: email, href: `mailto:${email}?subject=${encodeURIComponent(emailSubject)}` } : null,
  };
}
