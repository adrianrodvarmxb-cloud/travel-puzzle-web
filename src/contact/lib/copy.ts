/**
 * REQ-249: copy de /contacto (es/en). Puro. Solo canales que existen hoy: WhatsApp (+52 1 55 3649 0320) e
 * info@travelpuzzle.com.mx (D5: un solo correo público). Sin domicilio (D4) y sin enlace para llamadas.
 * El horario es el que ya dice /ayuda; los días quedan pendientes del PO.
 */
import { TOPIC_VALUES } from "../schemas/message";

export const TOPICS = TOPIC_VALUES;
type Topic = (typeof TOPICS)[number];

export interface ContactCopy {
  eyebrow: string;
  h1: string;
  lead: string;
  breadcrumbHome: string;
  meta: { title: string; description: string };
  wa: { title: string; text: string; cta: string; prefill: string };
  email: { title: string; text: string; subject: string };
  hours: { title: string; text: string };
  socials: { title: string };
  booked: { title: string; text: string; help: string };
  privacy: { text: string; link: string };
  form: {
    title: string; text: string; name: string; email: string; phone: string; phoneHint: string; topic: string;
    topics: Record<Topic, string>; message: string; consentA: string; consentLink: string; send: string; sending: string;
    sent: string; sentText: string; errorGeneric: string; errorUnavailable: string; fallback: string;
  };
}

const ES: ContactCopy = {
  eyebrow: "Contacto",
  h1: "Contacto",
  lead: "¿Tienes una duda o quieres que te armemos tu viaje? Escríbenos. Te responde una persona de Travel Puzzle.",
  breadcrumbHome: "Inicio",
  meta: {
    title: "Contacto",
    description: "Contacta a Travel Puzzle por WhatsApp (+52 1 55 3649 0320) o en info@travelpuzzle.com.mx, de 9:00 a 19:00 horas. Te armamos tu viaje.",
  },
  wa: { title: "Escríbenos por WhatsApp", text: "La forma más rápida. Cuéntanos a dónde vas y cuántos días tienes.", cta: "Abrir WhatsApp", prefill: "Hola Travel Puzzle, tengo una pregunta: " },
  email: { title: "Correo", text: "Para dudas o temas de tu reserva.", subject: "Contacto desde el sitio" },
  hours: { title: "Horario", text: "De 9:00 a 19:00 horas." },
  socials: { title: "Síguenos" },
  booked: {
    title: "¿Ya reservaste?",
    text: "Toda la información de tu reserva está en el enlace de tu correo de confirmación.",
    help: "Ver preguntas frecuentes",
  },
  privacy: { text: "Para ejercer tus derechos ARCO escribe a info@travelpuzzle.com.mx con el asunto «Derechos ARCO».", link: "Aviso de privacidad" },
  form: {
    title: "Envíanos un mensaje",
    text: "Te respondemos al correo que nos des.",
    name: "Nombre",
    email: "Correo",
    phone: "Teléfono (opcional)",
    phoneHint: "Si prefieres que te escribamos por WhatsApp.",
    topic: "Tema",
    topics: { viaje: "Quiero armar un viaje", reserva: "Tengo una reserva", otro: "Otro tema" },
    message: "Mensaje",
    consentA: "Leí y acepto el",
    consentLink: "Aviso de privacidad",
    send: "Enviar mensaje",
    sending: "Enviando…",
    sent: "Recibimos tu mensaje.",
    sentText: "Te respondemos al correo que nos diste, de 9:00 a 19:00 horas.",
    errorGeneric: "No se pudo enviar. Revisa los datos o escríbenos por WhatsApp.",
    errorUnavailable: "El formulario no está disponible ahora. Escríbenos por WhatsApp o por correo.",
    fallback: "Escríbenos por WhatsApp",
  },
};

const EN: ContactCopy = {
  ...ES,
  eyebrow: "Contact",
  h1: "Contact",
  lead: "Have a question or want us to build your trip? Write to us. A person from Travel Puzzle will reply.",
  breadcrumbHome: "Home",
  wa: { title: "Message us on WhatsApp", text: "The fastest way. Tell us where you're going and how many days you have.", cta: "Open WhatsApp", prefill: "Hi Travel Puzzle, I have a question: " },
  email: { title: "Email", text: "For questions or anything about your booking.", subject: "Contact from the website" },
  hours: { title: "Hours", text: "From 9:00 to 19:00." },
  socials: { title: "Follow us" },
  booked: { title: "Already booked?", text: "All your booking details are in the link in your confirmation email.", help: "See frequently asked questions" },
  privacy: { text: "To exercise your ARCO rights, write to info@travelpuzzle.com.mx with the subject «Derechos ARCO».", link: "Privacy notice" },
  form: {
    title: "Send us a message",
    text: "We'll reply to the email you give us.",
    name: "Name",
    email: "Email",
    phone: "Phone (optional)",
    phoneHint: "If you'd rather we write to you on WhatsApp.",
    topic: "Topic",
    topics: { viaje: "I want to plan a trip", reserva: "I have a booking", otro: "Something else" },
    message: "Message",
    consentA: "I have read and accept the",
    consentLink: "Privacy notice",
    send: "Send message",
    sending: "Sending…",
    sent: "We got your message.",
    sentText: "We'll reply to the email you gave us, from 9:00 to 19:00.",
    errorGeneric: "It couldn't be sent. Check your details or message us on WhatsApp.",
    errorUnavailable: "The form isn't available right now. Message us on WhatsApp or by email.",
    fallback: "Message us on WhatsApp",
  },
};

export function contactCopy(lang: string): ContactCopy {
  return lang === "es" ? ES : EN;
}
