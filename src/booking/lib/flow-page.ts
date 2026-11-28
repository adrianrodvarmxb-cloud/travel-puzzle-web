/**
 * REQ-10958 · Ola 8, paso de reserva único, PR 2: el modelo de la página `/reservar/<slug>` (plan
 * `docs/plan-ficha-unica-2026-11.md` §7 ola 8: «flujo único tras el botón»; REQ-10952 PR 1 = `flow.ts`). Puro: toma la
 * lectura de la ficha para la página de reserva (`readBooking`, REQ-10826: núcleo común + panel + prellenado) y el
 * plan del flujo (`bookingFlow`: pasos, canal y cobro) y arma lo que la página pinta: la barra de pasos con su estado,
 * el paso actual (de `?paso=`), los enlaces entre pasos con el prellenado válido y el resumen del producto. No decide
 * pasos por su cuenta (lo que diga `bookingFlow` es lo que se pinta), no lee el entorno ni sabe de componentes; el
 * cuerpo de cada paso llega registrado por props en la página (OCP/DIP, como `BookingControl`), y los que aún no
 * existen (calendario de Tangol en el PR 3, cobro con Stripe en el PR 4) caen al asesor. Nada cobra desde aquí.
 */
import type { FichaLang } from "@/ficha/lib/model";
import type { Query } from "@/ficha/lib/prefill";
import { prefillQuery } from "@/ficha/lib/prefill";
import type { BookingRead } from "@/ficha/lib/readers/booking";
import type { FlowChannel, FlowPayment, FlowPlan, FlowStep } from "./flow";

/** Etiqueta de cada paso en los 6 idiomas de la página (REQ-10635). */
export const FLOW_STEP_LABELS: Record<FichaLang, Record<FlowStep, string>> = {
  es: { "date-time": "Fecha y horario", people: "Personas", details: "Tus datos", payment: "Pago", confirmation: "Confirmación", "my-booking": "Mi reserva", advisor: "Habla con un asesor" },
  en: { "date-time": "Date and time", people: "People", details: "Your details", payment: "Payment", confirmation: "Confirmation", "my-booking": "My booking", advisor: "Talk to an advisor" },
  pt: { "date-time": "Data e horário", people: "Pessoas", details: "Seus dados", payment: "Pagamento", confirmation: "Confirmação", "my-booking": "Minha reserva", advisor: "Fale com um assessor" },
  fr: { "date-time": "Date et horaire", people: "Personnes", details: "Vos coordonnées", payment: "Paiement", confirmation: "Confirmation", "my-booking": "Ma réservation", advisor: "Parler à un conseiller" },
  de: { "date-time": "Datum und Uhrzeit", people: "Personen", details: "Ihre Daten", payment: "Zahlung", confirmation: "Bestätigung", "my-booking": "Meine Buchung", advisor: "Mit einem Berater sprechen" },
  it: { "date-time": "Data e orario", people: "Persone", details: "I tuoi dati", payment: "Pagamento", confirmation: "Conferma", "my-booking": "La mia prenotazione", advisor: "Parla con un consulente" },
};

export type FlowStepState = "done" | "current" | "todo";

export interface FlowStepView { id: FlowStep; label: string; state: FlowStepState; href: string }

export interface FlowSummary {
  title: string;
  place: string;
  duration: string | null;
  priceText: string | null;
  cancellation: string | null;
  /** Ruta pública de la ficha, para volver. */
  fichaPath: string;
}

export interface FlowPageModel {
  unified: boolean;
  channel: FlowChannel;
  payment: FlowPayment;
  leadHours: number | null;
  steps: FlowStepView[];
  current: FlowStep;
  prev: FlowStep | null;
  next: FlowStep | null;
  summary: FlowSummary;
  prefill: BookingRead["prefill"];
}

const STEP_IDS: readonly FlowStep[] = ["date-time", "people", "details", "payment", "confirmation", "my-booking", "advisor"];

/** Ruta de la página de reserva de una ficha: `/reservar/<slug>` (solo letras, números y guiones). */
// REQ-10958
export function bookingPagePath(slug: string): string {
  const limpio = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
  return `/reservar/${limpio}`;
}

const uno = (q: Query, k: string): string | undefined => (Array.isArray(q[k]) ? q[k]![0] : q[k]);

/** El paso pedido en `?paso=` si es uno de los del flujo; si no, el primero. */
// REQ-10958
export function stepFromQuery(q: Query, steps: readonly FlowStep[]): FlowStep {
  const pedido = uno(q, "paso");
  const esPaso = (s: string | undefined): s is FlowStep => s !== undefined && (STEP_IDS as readonly string[]).includes(s);
  if (esPaso(pedido) && steps.includes(pedido)) return pedido;
  return steps[0] ?? "advisor";
}

// REQ-10958
export function flowPage(i: { read: BookingRead; flow: FlowPlan; lang: FichaLang; slug: string; query: Query }): FlowPageModel {
  const steps = i.flow.steps.length > 0 ? i.flow.steps : (["advisor"] as FlowStep[]);
  const current = stepFromQuery(i.query, steps);
  const idx = steps.indexOf(current);
  const base = bookingPagePath(i.slug);
  const prefill = prefillQuery(i.read.prefill);
  const labels = FLOW_STEP_LABELS[i.lang] ?? FLOW_STEP_LABELS.es;
  const views: FlowStepView[] = steps.map((id, k) => ({
    id,
    label: labels[id],
    state: k < idx ? "done" : k === idx ? "current" : "todo",
    href: `${base}?paso=${id}${prefill ? `&${prefill}` : ""}`,
  }));
  const c = i.read.common;
  return {
    unified: i.flow.unified,
    channel: i.flow.channel,
    payment: i.flow.payment,
    leadHours: i.flow.leadHours,
    steps: views,
    current,
    prev: idx > 0 ? steps[idx - 1] : null,
    next: idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null,
    summary: { title: c.title, place: c.place, duration: c.duration, priceText: c.priceText, cancellation: c.cancellation, fichaPath: c.path },
    prefill: i.read.prefill,
  };
}
