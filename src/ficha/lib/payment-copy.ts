/**
 * Texto de pago y plazo único de confirmación (decisión 33 del plan de la ficha única, REQ-10611; código REQ-10653).
 * Firma del PO (14 nov 2026): «B: un solo texto de 48 horas hábiles para todos; lo leen igual la ficha y Mila».
 * Única fuente del plazo: «Cómo funciona tu reserva» (viajes), el panel del asesor (tours) y, cuando llegue, el
 * lector de Mila lo toman de aquí. Pura: sin I/O, sin reloj; el idioma llega por parámetro.
 */
export type CopyLang = "es" | "en" | "pt" | "de" | "fr" | "it";

/** Horas hábiles que Travel Puzzle se da para confirmar una solicitud. Un solo número para todos los proveedores. */
export const CONFIRMATION_BUSINESS_HOURS = 48;

const DEADLINE: Record<CopyLang, string> = {
  es: `${CONFIRMATION_BUSINESS_HOURS} horas hábiles`,
  en: `${CONFIRMATION_BUSINESS_HOURS} business hours`,
  pt: `${CONFIRMATION_BUSINESS_HOURS} horas úteis`,
  de: `${CONFIRMATION_BUSINESS_HOURS} Werktagsstunden`,
  fr: `${CONFIRMATION_BUSINESS_HOURS} heures ouvrées`,
  it: `${CONFIRMATION_BUSINESS_HOURS} ore lavorative`,
};

/** Paso 2 de «Cómo funciona tu reserva»: la confirmación con el operador, con el plazo único. */
const STEP: Record<CopyLang, string> = {
  es: `Confirmamos la disponibilidad con el operador local en un máximo de ${DEADLINE.es}.`,
  en: `We confirm availability with the local operator within ${DEADLINE.en}.`,
  pt: `Confirmamos a disponibilidade com o operador local em até ${DEADLINE.pt}.`,
  de: `Wir bestätigen die Verfügbarkeit mit dem lokalen Veranstalter innerhalb von ${DEADLINE.de}.`,
  fr: `Nous confirmons la disponibilité avec l'opérateur local sous ${DEADLINE.fr}.`,
  it: `Confermiamo la disponibilità con l'operatore locale entro ${DEADLINE.it}.`,
};

/** Panel «Apártalo con un asesor» de la ficha de tour: qué se confirma y en cuánto. */
const ADVISOR: Record<CopyLang, string> = {
  es: `Te confirmamos fecha, horario e idioma por WhatsApp en un máximo de ${DEADLINE.es}.`,
  en: `We confirm date, time and language on WhatsApp within ${DEADLINE.en}.`,
  pt: `Confirmamos data, horário e idioma pelo WhatsApp em até ${DEADLINE.pt}.`,
  de: `Wir bestätigen Datum, Uhrzeit und Sprache per WhatsApp innerhalb von ${DEADLINE.de}.`,
  fr: `Nous confirmons la date, l'heure et la langue sur WhatsApp sous ${DEADLINE.fr}.`,
  it: `Confermiamo data, orario e lingua su WhatsApp entro ${DEADLINE.it}.`,
};

const pick = (lang: string): CopyLang => (lang in DEADLINE ? (lang as CopyLang) : "en");

// REQ-10653
export function confirmationDeadline(lang: string): string {
  return DEADLINE[pick(lang)];
}

// REQ-10653
export function confirmationStep(lang: string): string {
  return STEP[pick(lang)];
}

// REQ-10653
export function advisorConfirmation(lang: string): string {
  return ADVISOR[pick(lang)];
}

/** Guarda: ¿el texto promete otro plazo que no sea el único? (horas sueltas distintas de 48, o «días»). */
// REQ-10653
export function promisesAnotherDeadline(text: string): boolean {
  const hours = [...text.matchAll(/\b(\d{1,3})\s*(?:h\b|horas?|hours?|heures?|ore|Stunden|Werktagsstunden)/gi)].map((m) => Number(m[1]));
  return hours.some((h) => h !== CONFIRMATION_BUSINESS_HOURS);
}
