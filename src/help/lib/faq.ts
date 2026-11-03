/**
 * Centro de ayuda (/ayuda). Funciones puras: preguntas, búsqueda e interruptor.
 * Las respuestas salen de los T&C del sitio y describen el sitio con reservas y cancelación en línea
 * encendidas, por eso la página solo se muestra con BOOKINGS_ENABLED="true" (gates, nov 2026).
 */
import { LEGAL_PATHS } from "@/legal/lib/labels";

export const HELP_PATH = "/ayuda";

/** Mismo interruptor que las reservas en línea. */
export function isHelpVisible(bookingsEnabled: string | undefined): boolean {
  return bookingsEnabled === "true";
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
  /** Palabras extra para el buscador (no se muestran). */
  tags?: string;
  link?: { href: string; label: string };
}

export interface FaqTopic {
  id: string;
  title: string;
  items: FaqItem[];
}

const ES: FaqTopic[] = [
  {
    id: "reservar",
    title: "Reservar",
    items: [
      {
        id: "como-reservar",
        tags: "reserva reservacion booking",
        q: "¿Cómo reservo un tour?",
        a: "En la ficha del tour eliges la fecha, el horario y el número de personas, y llenas tus datos. La confirmación te llega por correo con un enlace para consultar, modificar o cancelar tu reserva. Si prefieres, tu asesor te ayuda por WhatsApp.",
      },
      {
        id: "gratis",
        tags: "free propina tip",
        q: "¿Cómo funciona un free tour?",
        a: "Reservar no cuesta nada. Al terminar, le das al guía lo que consideres justo según tu experiencia; es voluntario y se entrega directamente al guía, en efectivo. Como referencia: en Europa €10 a €15 por persona (€20 o más si fue excepcional); en Estados Unidos y Canadá $10 a $20 USD; en Latinoamérica el equivalente a $5 a $10 USD en moneda local. Lleva billetes chicos o cambio.",
      },
      {
        id: "pago",
        tags: "precio pago price payment",
        q: "¿Cómo se pagan los tours con costo?",
        a: "El precio, la forma de pago y la política de cancelación se muestran en cada tour antes de reservar, y vienen también en tu confirmación.",
      },
    ],
  },
  {
    id: "cambios",
    title: "Cancelar y cambios",
    items: [
      {
        id: "cancelar",
        tags: "cancelacion cancellation reembolso refund modificar cambiar change",
        q: "¿Puedo cancelar o cambiar mi reserva?",
        a: "Sí, desde el enlace de tu correo de confirmación. Los tours sin costo se cancelan sin cargo en cualquier momento antes del tour. Los tours con costo, salvo que el tour indique otra cosa, se cancelan con reembolso hasta 24 h antes del inicio; con menos de 24 h no hay reembolso.",
      },
      {
        id: "no-llego",
        tags: "retraso tarde late no show cargo",
        q: "¿Qué pasa si llego tarde o no me presento?",
        a: "Preséntate puntual en el punto de encuentro: si no, el prestador puede negarte el acceso sin reembolso. En los tours con costo, no presentarte puede generar el cargo que el tour indique antes de reservar.",
      },
      {
        id: "reventa",
        tags: "revender regalar resell",
        q: "¿Puedo revender mi reserva?",
        a: "No. Las reservas son para uso personal tuyo y de tus acompañantes; las reservas revendidas pueden cancelarse.",
      },
    ],
  },
  {
    id: "dia-del-tour",
    title: "El día del tour",
    items: [
      {
        id: "que-llevar",
        tags: "llevar requisitos bring",
        q: "¿Qué tengo que llevar?",
        a: "Lo que indique cada tour, como identificación, vestimenta adecuada o edad mínima. Si tienes dudas, tu asesor te lo confirma por WhatsApp.",
      },
    ],
  },
  {
    id: "contacto",
    title: "Contacto y datos",
    items: [
      {
        id: "contacto",
        tags: "telefono whatsapp correo email horario phone",
        q: "¿Cómo los contacto?",
        a: "Por WhatsApp o en info@travelpuzzle.com.mx, de 9:00 a 19:00 horas. Toda la comunicación sobre tus reservas es con Travel Puzzle.",
      },
      {
        id: "datos",
        tags: "privacidad privacy arco datos data",
        q: "¿Qué hacen con mis datos?",
        a: "Los usamos para gestionar tu reserva y atenderte. Para ejercer tus derechos ARCO escribe a info@travelpuzzle.com.mx.",
        link: { href: LEGAL_PATHS.privacy, label: "Ver aviso de privacidad" },
      },
    ],
  },
];

const EN: FaqTopic[] = [
  {
    id: "reservar",
    title: "Booking",
    items: [
      {
        id: "como-reservar",
        tags: "reserva reservacion booking",
        q: "How do I book a tour?",
        a: "On the tour page choose the date, time and number of people, and fill in your details. Your confirmation arrives by email with a link to view, change or cancel your booking. If you prefer, your advisor can help you on WhatsApp.",
      },
      {
        id: "gratis",
        tags: "free propina tip",
        q: "How does a free tour work?",
        a: "Booking costs nothing. At the end, you give the guide what you think is fair for the experience; it's voluntary and goes directly to the guide, in cash. As a reference: in Europe €10 to €15 per person (€20+ if it was exceptional); in the US and Canada $10 to $20 USD; in Latin America the equivalent of $5 to $10 USD in local currency. Bring small bills or change.",
      },
      {
        id: "pago",
        tags: "precio pago price payment",
        q: "How do I pay for paid tours?",
        a: "The price, payment method and cancellation policy are shown on each tour before you book, and they're also in your confirmation.",
      },
    ],
  },
  {
    id: "cambios",
    title: "Cancellations and changes",
    items: [
      {
        id: "cancelar",
        tags: "cancelacion cancellation reembolso refund modificar cambiar change",
        q: "Can I cancel or change my booking?",
        a: "Yes, from the link in your confirmation email. Free tours can be cancelled at no cost any time before the tour. Paid tours, unless the tour says otherwise, can be cancelled with a refund up to 24 h before the start; with less than 24 h there is no refund.",
      },
      {
        id: "no-llego",
        tags: "retraso tarde late no show cargo",
        q: "What if I'm late or don't show up?",
        a: "Be on time at the meeting point: otherwise the provider may deny access without a refund. On paid tours, not showing up may incur the charge the tour states before booking.",
      },
      {
        id: "reventa",
        tags: "revender regalar resell",
        q: "Can I resell my booking?",
        a: "No. Bookings are for your personal use and your companions; resold bookings may be cancelled.",
      },
    ],
  },
  {
    id: "dia-del-tour",
    title: "On the day",
    items: [
      {
        id: "que-llevar",
        tags: "llevar requisitos bring",
        q: "What should I bring?",
        a: "Whatever each tour asks for, such as ID, suitable clothing or a minimum age. If in doubt, your advisor will confirm it on WhatsApp.",
      },
    ],
  },
  {
    id: "contacto",
    title: "Contact and data",
    items: [
      {
        id: "contacto",
        tags: "telefono whatsapp correo email horario phone",
        q: "How can I contact you?",
        a: "On WhatsApp or at info@travelpuzzle.com.mx, from 9:00 to 19:00. All communication about your bookings is with Travel Puzzle.",
      },
      {
        id: "datos",
        tags: "privacidad privacy arco datos data",
        q: "What do you do with my data?",
        a: "We use it to manage your booking and assist you. To exercise your ARCO rights write to info@travelpuzzle.com.mx.",
        link: { href: LEGAL_PATHS.privacy, label: "Privacy notice (Spanish)" },
      },
    ],
  },
];

export function faqTopics(lang: string): FaqTopic[] {
  return lang === "es" ? ES : EN;
}

/** Minúsculas y sin acentos, para buscar como escribe la gente. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Filtra por pregunta y respuesta; una búsqueda vacía regresa todo. */
export function searchFaq(items: FaqItem[], query: string): FaqItem[] {
  const q = normalize(query);
  if (!q) return items;
  return items.filter((i) => normalize(`${i.q} ${i.a} ${i.tags ?? ""}`).includes(q));
}

export interface HelpCopy {
  eyebrow: string;
  title: string;
  sub: string;
  search: string;
  empty: string;
  stillTitle: string;
  stillSub: string;
  stillCta: string;
  waText: string;
  footerLink: string;
}

const COPY_ES: HelpCopy = {
  eyebrow: "TRAVEL PUZZLE · AYUDA",
  title: "Centro de ayuda",
  sub: "Respuestas rápidas sobre reservas, cancelaciones y el día de tu tour.",
  search: "Buscar en la ayuda",
  empty: "No encontramos esa pregunta. Escríbenos y te ayudamos.",
  stillTitle: "¿No encontraste tu respuesta?",
  stillSub: "Un asesor en español te atiende por WhatsApp.",
  stillCta: "Hablar con un asesor",
  waText: "Hola Travel Puzzle, tengo una duda: ",
  footerLink: "Centro de ayuda",
};

const COPY_EN: HelpCopy = {
  eyebrow: "TRAVEL PUZZLE · HELP",
  title: "Help center",
  sub: "Quick answers about bookings, cancellations and the day of your tour.",
  search: "Search help",
  empty: "We couldn't find that question. Message us and we'll help.",
  stillTitle: "Didn't find your answer?",
  stillSub: "An advisor will help you on WhatsApp.",
  stillCta: "Talk to an advisor",
  waText: "Hi Travel Puzzle, I have a question: ",
  footerLink: "Help center",
};

export function helpCopy(lang: string): HelpCopy {
  return lang === "es" ? COPY_ES : COPY_EN;
}
