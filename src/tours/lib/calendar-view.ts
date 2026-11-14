/**
 * Vista del calendario de fechas: todo lo que depende del idioma se arma AQUÍ, en el servidor (INC-001).
 * El componente de cliente solo cambia de mes; no formatea nada ni mira el reloj.
 *
 * Puro. Lo que sale de aquí es lo único que viaja al cliente: día, si se ofrece y su precio público.
 * Ni neto, ni comisión, ni nombre del proveedor (REQ-1543, REQ-1556, REQ-3471).
 */
import type { DayAvailability } from "./date-availability";
import type { ProviderCalendar } from "./provider-availability";

export interface CellView {
  day: number;
  date: string;
  bookable: boolean;
  /** Precio público ya formateado (sin Intl), o null si ese día no se ofrece o es gratis. */
  price: string | null;
}

export interface MonthView {
  month: string;
  label: string;
  /** Rejilla de 7 columnas desde el lunes; `null` son los huecos antes del día 1 y después del último. */
  cells: (CellView | null)[];
}

export interface CalendarCopy {
  months: string[];
  weekdays: string[];
  title: string;
  note: string;
  closed: string;
  prev: string;
  next: string;
}

export interface CalendarViewModel {
  months: MonthView[];
  weekdays: string[];
  currency: string | null;
  /** Mes que se abre: el primero con alguna fecha que se ofrece. */
  start: number;
  copy: Pick<CalendarCopy, "title" | "note" | "closed" | "prev" | "next">;
}

const MESES: Record<string, string> = {
  es: "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre",
  en: "January|February|March|April|May|June|July|August|September|October|November|December",
  pt: "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro",
  de: "Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember",
  fr: "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre",
  it: "gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre",
};

/** Días de la semana desde el lunes (como los calendarios de Civitatis y GetYourGuide en español). */
const DIAS: Record<string, string> = {
  es: "lun|mar|mié|jue|vie|sáb|dom",
  en: "Mon|Tue|Wed|Thu|Fri|Sat|Sun",
  pt: "seg|ter|qua|qui|sex|sáb|dom",
  de: "Mo|Di|Mi|Do|Fr|Sa|So",
  fr: "lun|mar|mer|jeu|ven|sam|dim",
  it: "lun|mar|mer|gio|ven|sab|dom",
};

const TEXTOS: Record<string, Pick<CalendarCopy, "title" | "note" | "closed" | "prev" | "next">> = {
  es: { title: "Fechas y precios", note: "Precio por adulto de cada fecha. La fecha se confirma al apartar.", closed: "Sin salida", prev: "Mes anterior", next: "Mes siguiente" },
  en: { title: "Dates and prices", note: "Price per adult for each date. The date is confirmed when you book.", closed: "No departure", prev: "Previous month", next: "Next month" },
  pt: { title: "Datas e preços", note: "Preço por adulto em cada data. A data se confirma na reserva.", closed: "Sem saída", prev: "Mês anterior", next: "Mês seguinte" },
  de: { title: "Termine und Preise", note: "Preis pro Erwachsenen für jedes Datum. Das Datum wird bei der Buchung bestätigt.", closed: "Keine Abfahrt", prev: "Voriger Monat", next: "Nächster Monat" },
  fr: { title: "Dates et prix", note: "Prix par adulte pour chaque date. La date est confirmée à la réservation.", closed: "Pas de départ", prev: "Mois précédent", next: "Mois suivant" },
  it: { title: "Date e prezzi", note: "Prezzo per adulto per ogni data. La data si conferma alla prenotazione.", closed: "Nessuna partenza", prev: "Mese precedente", next: "Mese successivo" },
};

// REQ-3469
export function calendarCopy(lang: string): CalendarCopy {
  const l = MESES[lang] ? lang : "en";
  return { months: MESES[l].split("|"), weekdays: DIAS[l].split("|"), ...TEXTOS[l] };
}

/** «2026-12» → «diciembre 2026». Sin Intl: tabla fija, igual en el servidor y en el cliente. */
// REQ-3469
export function monthLabel(month: string, copy: CalendarCopy): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  return `${copy.months[Number(m[2]) - 1] ?? month} ${m[1]}`;
}

/** Precio del día, sin Intl y sin redondeos que engañen (dos decimales como máximo). */
// REQ-3469
export function dayPrice(from: number | null, currency: string | null): string | null {
  if (from === null || !(from > 0)) return null;
  const n = Math.round(from * 100) / 100;
  return currency ? `${currency} ${n}` : String(n);
}

const LUNES = (jsDay: number) => (jsDay + 6) % 7;

/** Rejilla de 7 columnas de un mes, con los huecos de los bordes. Pura. */
// REQ-3469
export function monthGrid(days: readonly DayAvailability[]): (CellView | null)[] {
  if (!days.length) return [];
  const primero = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const antes: null[] = Array(LUNES(primero)).fill(null);
  const celdas: (CellView | null)[] = [
    ...antes,
    ...days.map((d) => ({ day: Number(d.date.slice(8, 10)), date: d.date, bookable: d.bookable, price: dayPrice(d.from, d.currency) })),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

/** Todo lo que el cliente necesita para pintar el calendario, ya en el idioma de la página. */
// REQ-3469, REQ-3471
export function calendarView(cal: ProviderCalendar, lang: string): CalendarViewModel {
  const copy = calendarCopy(lang);
  return {
    months: cal.months.map((m) => ({ month: m.month, label: monthLabel(m.month, copy), cells: monthGrid(m.days) })),
    weekdays: copy.weekdays,
    currency: cal.currency,
    start: cal.start,
    copy: { title: copy.title, note: copy.note, closed: copy.closed, prev: copy.prev, next: copy.next },
  };
}
