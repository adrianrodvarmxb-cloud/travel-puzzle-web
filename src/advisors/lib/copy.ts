/**
 * REQ-250: copy de /asesores, «Habla con un asesor de viaje» (es/en). Puro.
 * El encargo lo llamó «Habla con nuestros viajeros expertos»; el PO pidió no prometer expertos que no existan:
 * aquí son asesores de viaje de Travel Puzzle, y solo se dice lo que hacen hoy (proponer tours y horarios por WhatsApp,
 * de 10:00 a 14:00 y de 16:00 a 20:00). El bloque de personas queda en borrador hasta tener nombres, fotos y permisos.
 */
import { textsOf } from "@/site/lib/vocab";

export interface AdvisorBlock { id: string; status: "aprobado" | "pendiente"; title: string; items: { title: string; text: string }[] }

export interface AdvisorCopy {
  eyebrow: string;
  h1: string;
  lead: string;
  breadcrumbHome: string;
  meta: { title: string; description: string };
  wa: { title: string; text: string; cta: string; prefill: string; hours: string };
  blocks: AdvisorBlock[];
  form: {
    title: string; text: string; name: string; email: string; phone: string; destination: string; destinationHint: string;
    when: string; whenHint: string; message: string; consentA: string; consentLink: string; send: string; sending: string;
    sent: string; sentText: string; errorGeneric: string; errorUnavailable: string; fallback: string;
  };
}

const ES: AdvisorCopy = {
  eyebrow: "Asesoría personalizada",
  h1: "Habla con un asesor de viaje",
  lead: "Cuéntanos a dónde vas y cuántos días tienes. Un asesor de Travel Puzzle te propone tours y horarios a tu medida.",
  breadcrumbHome: "Inicio",
  meta: {
    title: "Habla con un asesor de viaje",
    description: "Escríbele a un asesor de viaje de Travel Puzzle por WhatsApp o déjanos tus datos: te propone tours y horarios para tu viaje.",
  },
  wa: {
    title: "Escríbele por WhatsApp",
    text: "Es la forma más rápida de hablar con un asesor.",
    cta: "Hablar con un asesor",
    prefill: "Hola Travel Puzzle, quiero hablar con un asesor de viaje. Voy a: ",
    hours: "De 10:00 a 14:00 y de 16:00 a 20:00 horas.",
  },
  blocks: [
    {
      id: "como-funciona", status: "aprobado", title: "Cómo funciona",
      items: [
        { title: "Nos cuentas tu viaje", text: "Destino, fechas y cuántas personas van. Por WhatsApp o con el formulario." },
        { title: "Te proponemos tours y horarios", text: "El asesor te sugiere tours para los días que tienes, con su precio y sus condiciones." },
        { title: "Tú decides", text: "Reservas lo que te guste. Los tours los operan guías y agencias de cada ciudad." },
      ],
    },
    {
      id: "equipo", status: "pendiente", title: "Quiénes te atienden",
      items: [{ title: "[PO: nombre del asesor]", text: "[PO: destinos que conoce, foto y permiso escrito para publicarlo]" }],
    },
  ],
  form: {
    title: "O déjanos tus datos",
    text: "Un asesor te escribe al correo (o al WhatsApp, si nos lo das).",
    name: "Nombre",
    email: "Correo",
    phone: "WhatsApp (opcional)",
    destination: "¿A dónde quieres ir?",
    destinationHint: "Ciudad o país",
    when: "¿Cuándo? (opcional)",
    whenHint: "Por ejemplo: marzo, 8 días",
    message: "Algo más (opcional)",
    consentA: "Leí y acepto el",
    consentLink: "Aviso de privacidad",
    send: "Enviar",
    sending: "Enviando…",
    sent: "Recibimos tus datos.",
    sentText: "Un asesor de Travel Puzzle te escribe de 10:00 a 14:00 y de 16:00 a 20:00 horas.",
    errorGeneric: "No se pudo enviar. Revisa los datos o escríbenos por WhatsApp.",
    errorUnavailable: "El formulario no está disponible ahora. Escríbenos por WhatsApp.",
    fallback: "Escríbenos por WhatsApp",
  },
};

const EN: AdvisorCopy = {
  ...ES,
  eyebrow: "Personal advice",
  h1: "Talk to a travel advisor",
  lead: "Tell us where you're going and for how many days. A Travel Puzzle advisor will propose tours and times tailored to you.",
  breadcrumbHome: "Home",
  wa: {
    title: "Message us on WhatsApp",
    text: "The fastest way to talk to an advisor.",
    cta: "Talk to an advisor",
    prefill: "Hi Travel Puzzle, I'd like to talk to a travel advisor. I'm going to: ",
    hours: "From 10:00 to 14:00 and 16:00 to 20:00.",
  },
  blocks: [
    {
      id: "como-funciona", status: "aprobado", title: "How it works",
      items: [
        { title: "Tell us about your trip", text: "Destination, dates and how many people. On WhatsApp or with the form." },
        { title: "We suggest tours and times", text: "The advisor suggests tours for the days you have, with their price and conditions." },
        { title: "You decide", text: "Book what you like. Tours are run by guides and agencies in each city." },
      ],
    },
    { id: "equipo", status: "pendiente", title: "Who helps you", items: [{ title: "[PO: advisor]", text: "[PO: permiso]" }] },
  ],
  form: {
    ...ES.form,
    title: "Or leave us your details",
    text: "An advisor will write to your email (or WhatsApp, if you give it to us).",
    name: "Name",
    email: "Email",
    phone: "WhatsApp (optional)",
    destination: "Where do you want to go?",
    destinationHint: "City or country",
    when: "When? (optional)",
    whenHint: "For example: March, 8 days",
    message: "Anything else (optional)",
    consentA: "I have read and accept the",
    consentLink: "Privacy notice",
    send: "Send",
    sending: "Sending…",
    sent: "We got your details.",
    sentText: "A Travel Puzzle advisor will write to you from 10:00 to 14:00 and 16:00 to 20:00.", // REQ-3382 (horario de REQ-1248)
    errorGeneric: "It couldn't be sent. Check your details or message us on WhatsApp.",
    errorUnavailable: "The form isn't available right now. Message us on WhatsApp.",
    fallback: "Message us on WhatsApp",
  },
};

export function advisorCopy(lang: string): AdvisorCopy {
  return lang === "es" ? ES : EN;
}

// REQ-250: solo bloques aprobados y sin huecos [PO: …].
export function visibleAdvisorBlocks(c: AdvisorCopy): AdvisorBlock[] {
  return c.blocks.filter((b) => b.status === "aprobado" && !textsOf(b).some((t) => t.includes("[PO:")));
}
