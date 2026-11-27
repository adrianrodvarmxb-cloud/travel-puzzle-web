/**
 * REQ-10952 · Ola 8, paso de reserva único (plan `docs/plan-ficha-unica-2026-11.md` §2 y §7; decisión 7 = B,
 * REQ-10586; REQ-10635; firmas del PO del 17 y 26 nov: REQ-10766 y REQ-10775). PR 1: la decisión pura, sin pantalla.
 *
 * Qué decide: dado el modelo de la ficha y el plan del panel (`panel-plan.ts`), qué pasos sigue el cliente tras el
 * botón, por qué canal se reserva y quién cobra.
 * - Bandera `BOOKING_FLOW_UNICO_ENABLED` apagada ("false", el valor de arranque): el flujo de hoy, control por control,
 *   sin cambio alguno (regreso del plan: «apagar la bandera»).
 * - Encendida: todo producto que NO sea de FREETOUR sigue los mismos pasos que el flujo de FREETOUR (fecha y horario →
 *   personas → datos → pago → confirmación → «mi reserva»), la reserva va por la API del proveedor (Tangol; OCTO para
 *   Big Bus) o como solicitud (agencias) y el cobro va siempre con nuestro Stripe (REQ-10775). FREETOUR no cambia:
 *   su calendario y su checkout siguen siendo los suyos (nada de FREETOUR sin revisión de cumplimiento).
 * - Sin precio conocido no hay paso de pago (REQ-10766: nada cobra a ciegas); el panel caído al asesor manda.
 *
 * Puro: no lee `process.env`, no sabe de rutas ni de componentes. Nada de aquí enciende un cobro: cada encendido se
 * le pide al PO aparte, con preview, humo y una compra de prueba en Stripe (REQ-10766).
 */
import type { FichaBooking, FichaModel } from "@/ficha/lib/model";
import { fichaUnicaMode, isPreviewHost } from "@/ficha/lib/flags";
import type { PanelPlan } from "@/ficha/lib/panel-plan";

/** Lo que el flujo necesita del modelo de la ficha (ISP). */
export type FlowProduct = { provider: string; booking: FichaBooking; price: Pick<NonNullable<FichaModel["price"]>, "amount" | "currency"> | null };

/** Pasos que ve el cliente; «advisor» es el flujo de hoy cuando el panel cae al asesor. */
export type FlowStep = "date-time" | "people" | "details" | "payment" | "confirmation" | "my-booking" | "advisor";

/** Por dónde entra la reserva al proveedor. */
export type FlowChannel = "freetour-api" | "tangol-api" | "octo" | "request" | "advisor";

/** Quién cobra y con qué: FREETOUR con su checkout; los demás con nuestro Stripe; «none» = sin cobro en línea. */
export type FlowPayment = "provider-checkout" | "stripe-travelpuzzle" | "none";

export interface FlowPlan {
  unified: boolean;
  steps: FlowStep[];
  channel: FlowChannel;
  payment: FlowPayment;
  leadHours: number | null;
}

/** Los pasos del flujo de FREETOUR, espejo para todos (REQ-10775). */
export const UNIFIED_STEPS: readonly FlowStep[] = ["date-time", "people", "details", "payment", "confirmation", "my-booking"];

const FREETOUR = "freetour";
const TANGOL = "tangol";

/** `BOOKING_FLOW_UNICO_ENABLED`: "false" | "preview" | "true", igual que las banderas de la plantilla (REQ-10859). */
// REQ-10952
export function bookingFlowUnicoOn(env: Record<string, string | undefined>, host: string | null | undefined): boolean {
  const mode = fichaUnicaMode(env.BOOKING_FLOW_UNICO_ENABLED);
  if (mode === "true") return true;
  if (mode === "preview") return isPreviewHost(host);
  return false;
}

/** Canal según el proveedor y cómo se reserva; nunca según banderas (INC-020). */
// REQ-10775
function channelFor(p: FlowProduct): FlowChannel {
  const provider = p.provider.trim().toLowerCase();
  if (provider === FREETOUR) return "freetour-api";
  if (provider === TANGOL) return "tangol-api";
  if (p.booking.mode === "purchase") return "octo";
  return "request";
}

/** El flujo de hoy, control por control (lo que ya existe en pantalla; no cambia nada). */
// REQ-10952
function legacyFlow(p: FlowProduct, panel: PanelPlan): Omit<FlowPlan, "unified"> {
  const leadHours = p.booking.leadHours;
  switch (panel.control) {
    case "calendar": {
      const paid = panel.chargedBy !== "none";
      return {
        steps: paid ? [...UNIFIED_STEPS] : UNIFIED_STEPS.filter((s) => s !== "payment"),
        channel: channelFor(p),
        payment: paid ? (panel.chargedBy === "provider" ? "provider-checkout" : "stripe-travelpuzzle") : "none",
        leadHours,
      };
    }
    case "purchase-box":
      return { steps: ["date-time", "people", "details", "payment", "confirmation"], channel: channelFor(p), payment: "stripe-travelpuzzle", leadHours };
    case "request-form":
      return { steps: ["date-time", "people", "details", "confirmation"], channel: "request", payment: "none", leadHours };
    case "advisor":
      return { steps: ["advisor"], channel: "advisor", payment: "none", leadHours };
  }
}

/** El flujo único: espejo de FREETOUR con nuestro Stripe para todo lo que no es de FREETOUR. */
// REQ-10775
function unifiedFlow(p: FlowProduct, panel: PanelPlan): Omit<FlowPlan, "unified"> {
  const leadHours = p.booking.leadHours;
  if (panel.control === "advisor") return { steps: ["advisor"], channel: "advisor", payment: "none", leadHours };
  const channel = channelFor(p);
  if (channel === "freetour-api") return legacyFlow(p, panel);
  const priced = p.price !== null && p.price.amount > 0;
  return {
    steps: priced ? [...UNIFIED_STEPS] : UNIFIED_STEPS.filter((s) => s !== "payment"),
    channel,
    payment: priced ? "stripe-travelpuzzle" : "none",
    leadHours,
  };
}

/**
 * Plan del flujo tras el botón. `unified` viene resuelto por la ruta con `bookingFlowUnicoOn` (DIP: aquí no se lee el
 * entorno). Con `unified: false` devuelve el flujo de hoy, idéntico control por control.
 */
// REQ-10952
export function bookingFlow(p: FlowProduct, panel: PanelPlan, opts: { unified: boolean }): FlowPlan {
  const base = opts.unified ? unifiedFlow(p, panel) : legacyFlow(p, panel);
  return { unified: opts.unified, ...base };
}
