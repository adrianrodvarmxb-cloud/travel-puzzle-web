/** Cómo se aparta un tour desde su ficha. Funciones puras (gate 3 y 4 de la auditoría de diseño, nov 2026). */
export type BookingMode = "advisor" | "calendar";

/** Con `BOOKINGS_ENABLED` apagado se aparta con un asesor por WhatsApp; encendido, con el calendario. */
export function bookingMode(bookingsEnabled: boolean): BookingMode {
  return bookingsEnabled ? "calendar" : "advisor";
}

/** Dónde va la franja de transporte en la ficha: bajo el botón del asesor o bajo el calendario. */
// REQ-009
export function crossSellSlot(mode: BookingMode): "under-advisor" | "under-calendar" {
  return mode === "calendar" ? "under-calendar" : "under-advisor";
}

/** Mensaje que se abre en WhatsApp para apartar el tour. */
export function advisorText(title: string, lang: string): string {
  const t = title.trim();
  if (lang === "es") return t ? `Hola Travel Puzzle, quiero apartar el tour «${t}».` : "Hola Travel Puzzle, quiero apartar un tour.";
  return t ? `Hi Travel Puzzle, I'd like to book the tour «${t}».` : "Hi Travel Puzzle, I'd like to book a tour.";
}

export function priceText(price: number, currency: string, freeLabel: string): string {
  return price > 0 ? `${currency} ${price}` : freeLabel;
}

interface BookingCopy {
  advisorTitle: string;
  advisorSub: string;
  advisorCta: string;
  barCta: (m: BookingMode) => string;
}

const ES: BookingCopy = {
  advisorTitle: "Apártalo con un asesor",
  advisorSub: "Te confirmamos fecha, horario e idioma por WhatsApp.",
  advisorCta: "Hablar con un asesor",
  barCta: (m: BookingMode) => (m === "advisor" ? "Apartar con un asesor" : "Reservar"),
};

const EN: BookingCopy = {
  advisorTitle: "Book it with an advisor",
  advisorSub: "We confirm date, time and language on WhatsApp.",
  advisorCta: "Talk to an advisor",
  barCta: (m) => (m === "advisor" ? "Book with an advisor" : "Book now"),
};

export function bookingCopy(lang: string): BookingCopy {
  return lang === "es" ? ES : EN;
}

