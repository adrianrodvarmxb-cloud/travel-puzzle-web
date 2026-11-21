/**
 * REQ-10813 (plan REQ-3457 §3 «Carga inicial: preguntas abiertas por proveedor» y §8; G5-A: «Primero los 7 publicados»).
 * Puro: la lista inicial de preguntas abiertas de los 7 proveedores publicados, el SQL de carga (solo la columna
 * `preguntas` de la 0033, REQ-10649) y su punto de regreso. Las preguntas salen de lo que ya se les pidió por correo
 * (hilos del 11 y 12 nov 2026 y borradores del 19 nov en el Proyecto de Claude, `claude/primeros-correos-proveedores-2026-11-19.md`);
 * lo ya recibido no se vuelve a pedir. Nunca montos, porcentajes, cuentas ni datos fiscales (`sinMontos`).
 * Sin red, sin base, sin reloj: quien carga (`src/scripts/carga-preguntas.ts`) simula por defecto.
 */
import type { Pregunta, Tema } from "./preguntas";
import type { ProveedorSemilla } from "./directorio";

/** Los 7 publicados de la firma G5-A (12 nov 2026). Tangol también está publicado, pero va por API y no se le escribe por esta vía. */
export const PUBLICADOS_G5 = ["big-bus-tours", "destino-colombia", "exotic-escapes", "extime-travel", "fantastica-china", "inca-world-peru", "turismo-asiatico"] as const;
export type PublicadoG5 = (typeof PUBLICADOS_G5)[number];

const p = (proveedor: PublicadoG5, n: number, tema: Tema, desde: string, es: string, en: string, req: string | null = null): Pregunta =>
  ({ id: `${proveedor}:${String(n).padStart(2, "0")}`, tema, es, en, req, desde, cerrada: null });

// REQ-10813
export const PREGUNTAS_INICIALES: Record<PublicadoG5, Pregunta[]> = {
  "big-bus-tours": [
    p("big-bus-tours", 1, "cancelacion", "2026-11-11",
      "Reglas de cancelación y cambio de fecha por producto, y cómo procesan los reembolsos.",
      "Cancellation and date-change rules per product, and how refunds are processed."),
    p("big-bus-tours", 2, "pago", "2026-11-11",
      "Cómo se liquidan las reservas hechas por el Partner Booking Platform y si algo cambia cuando Ventrata OCTO esté activo.",
      "How we settle bookings made through the Partner Booking Platform, and whether anything changes once Ventrata OCTO is live."),
    p("big-bus-tours", 3, "tarifas", "2026-11-11",
      "Permiso por escrito para usar sus fotos oficiales y su logo en travelpuzzle.com.mx (hoy usamos fotos de archivo).",
      "Written permission to use your official photos and logo on travelpuzzle.com.mx (today we only use stock photos)."),
    p("big-bus-tours", 4, "alta", "2026-11-11",
      "Sus términos y condiciones para socios y sus comentarios al acuerdo de intermediación (ES/EN) del 11 de noviembre.",
      "Your partner terms and conditions, and your comments on the intermediation agreement (ES/EN) sent on 11 November.", "REQ-1366"),
    p("big-bus-tours", 5, "alta", "2026-11-11",
      "Datos legales de la empresa y los nombres y domicilios que deben aparecer en el acuerdo.",
      "Your company's legal details and the names and addresses that should appear in the agreement."),
  ],
  "destino-colombia": [
    p("destino-colombia", 1, "cancelacion", "2026-11-11",
      "La política de cancelación exacta por circuito (sus términos de 2023 no la definen) y la cancelación de hoteles por plan.",
      "The exact cancellation policy per circuit (your 2023 terms do not define it) and hotel cancellation per plan."),
    p("destino-colombia", 2, "calendario", "2026-11-11",
      "La anticipación mínima para reservar (¿24 horas o sin mínimo?) y si habrá tarifas para compras después del 15 de diciembre de 2026.",
      "Minimum lead time to book (24 hours or none?) and whether there will be rates for purchases after 15 December 2026."),
    p("destino-colombia", 3, "pago", "2026-11-11",
      "Plazo y moneda de la factura por reserva.",
      "Payment term and currency of the invoice per booking."),
    p("destino-colombia", 4, "alta", "2026-11-11",
      "La versión 2026 de sus términos y condiciones, marcando lo que cambió frente a 2023.",
      "The 2026 version of your terms and conditions, marking what changed from 2023."),
    p("destino-colombia", 5, "alta", "2026-11-11",
      "Sus comentarios al acuerdo de intermediación, los datos legales de la empresa y el acceso a su portal de socios.",
      "Your comments on the intermediation agreement, your company's legal details and access to your partner portal."),
  ],
  "exotic-escapes": [
    p("exotic-escapes", 1, "tarifas", "2026-11-11",
      "Vuelos internos: quién emite el boleto, tarifa, reglas de cambio y cancelación, y quién reembolsa si la aerolínea cambia.",
      "Domestic flights: who issues the ticket, fare, change and cancellation rules, and who refunds if the airline changes.", "REQ-1375"),
    p("exotic-escapes", 2, "cancelacion", "2026-11-11",
      "Confirmar si Sri Lanka cancela sin cargo con más de 21 días (el tarifario 2027/28 dice 21; nuestra base dice 22) y la política para agencias (cláusula 4.5).",
      "Confirm whether Sri Lanka cancels free of charge beyond 21 days (the 2027/28 rate sheet says 21; our records say 22) and the agency policy (clause 4.5).", "REQ-1376"),
    p("exotic-escapes", 3, "calendario", "2026-11-11",
      "Fechas del Festival de Kandy y el precio de la temporada de Navidad en India.",
      "Dates of the Kandy Festival and the Christmas-season price in India."),
    p("exotic-escapes", 4, "tarifas", "2026-11-11",
      "Confirmar que las actualizaciones de tarifas nos llegarán por correo (cláusula 8.2).",
      "Confirm that rate updates will reach us by email (clause 8.2)."),
    p("exotic-escapes", 5, "alta", "2026-11-11",
      "Permiso de fotos con crédito (cláusula 6.1), datos legales de la empresa y el Anexo 2 (documentos de la parte B).",
      "Photo permission with credit (clause 6.1), your company's legal details and Annex 2 (party B documents).", "REQ-1378"),
  ],
  "extime-travel": [
    p("extime-travel", 1, "tarifas", "2026-11-11",
      "Las fotos de los 20 productos que les listamos, con la línea de crédito que quieren que usemos.",
      "The images for the 20 products we listed, with the credit line you want us to use."),
    p("extime-travel", 2, "calendario", "2026-11-11",
      "El idioma de operación de los 46 productos que les señalamos.",
      "The operating language of the 46 products we flagged."),
    p("extime-travel", 3, "cancelacion", "2026-11-11",
      "Qué política de cancelación aplica (48/72 horas según su nota del 16 de octubre, o 24 horas según los documentos) y el programa 5D4N que difiere entre documentos.",
      "Which cancellation policy applies (48/72 h per your 16 October note vs. 24 h in the documents) and the 5D4N programme that differs between documents."),
    p("extime-travel", 4, "pago", "2026-11-11",
      "Una nueva fecha para la llamada que propusimos para el 17 o 18 de noviembre, si no se realizó.",
      "A new slot for the call we proposed for 17–18 November, if it did not take place."),
    p("extime-travel", 5, "alta", "2026-11-11",
      "Sus comentarios al acuerdo de intermediación, sus términos para socios, datos legales y confirmación de que nuestra cuenta B2B en pro.extimetravel.com está activa.",
      "Your comments on the intermediation agreement, your partner terms, legal details, and confirmation that our B2B account on pro.extimetravel.com is active.", "REQ-1398"),
  ],
  "fantastica-china": [
    p("fantastica-china", 1, "pago", "2026-11-12",
      "Confirmar que el plazo de pago va en la factura de cada reserva y solo por transferencia, y el correo al que debemos mandar las reservas.",
      "Confirm that the payment term goes on each booking's invoice and by bank transfer only, and the email address where we should send bookings.", "REQ-1675"),
    p("fantastica-china", 2, "calendario", "2026-11-12",
      "Si hay salidas del 18 al 30 de enero, y los recargos por fecha (Feria de Cantón y salidas fuera de lunes, martes y jueves) con sus fechas 2027.",
      "Whether there are departures from 18 to 30 January, and the date surcharges (Canton Fair and departures outside Monday, Tuesday and Thursday) with their 2027 dates."),
    p("fantastica-china", 3, "cancelacion", "2026-11-12",
      "Qué pasa con la reubicación del viajero si una aerolínea cambia un vuelo interno.",
      "What happens with the traveller's rebooking if an airline changes a domestic flight."),
    p("fantastica-china", 4, "tarifas", "2026-11-12",
      "Confirmar por escrito la regla de la cláusula 8.2: las tarifas contratadas no cambian salvo variación del tipo de cambio o reservas de última hora.",
      "Confirm in writing the rule of clause 8.2: contracted rates do not change except for exchange-rate variation or last-minute bookings."),
    p("fantastica-china", 5, "alta", "2026-11-12",
      "Datos legales de la empresa y permiso de fotos con crédito.",
      "Your company's legal details and photo permission with credit."),
  ],
  "inca-world-peru": [
    p("inca-world-peru", 1, "cancelacion", "2026-11-19",
      "La penalidad entre 61 y 31 días antes (la tabla que tenemos salta de 62 a 16 días) y la regla de las entradas nominativas a Machu Picchu.",
      "The penalty between 61 and 31 days before departure (our table jumps from 62 to 16 days) and the rule for named Machu Picchu tickets."),
    p("inca-world-peru", 2, "tarifas", "2026-11-19",
      "Vigencia del tarifario, si el precio base es por persona en habitación doble, y los productos que aparecen sin tarifa.",
      "Validity of the rate sheet, whether the base price is per person in a double room, and the products that appear without a rate."),
    p("inca-world-peru", 3, "calendario", "2026-11-19",
      "La anticipación mínima por producto (vemos 10 y 60 días según el caso) y las duraciones que difieren entre documentos.",
      "Minimum lead time per product (we see 10 and 60 days depending on the case) and the durations that differ between documents."),
    p("inca-world-peru", 4, "pago", "2026-11-19",
      "El contacto operativo de reservas (además del teléfono 24/7 que ya tenemos) y las fotos oficiales que nos ofrecieron el 9 de noviembre.",
      "The operational booking contact (besides the 24/7 phone we already have) and the official photos offered on 9 November.", "REQ-1524"),
    p("inca-world-peru", 5, "alta", "2026-11-19",
      "El acuerdo de intermediación para revisión y firma, datos legales y el PDF del tarifario completo.",
      "The intermediation agreement for review and signature, legal details and the full rate-sheet PDF.", "REQ-10574"),
  ],
  "turismo-asiatico": [
    p("turismo-asiatico", 1, "tarifas", "2026-11-19",
      "Si las tarifas que nos compartieron son netas o comisionables, y el precio de las noches de hotel que aparecen sin monto.",
      "Whether the rates you shared are net or commissionable, and the price of the hotel nights that appear without an amount."),
    p("turismo-asiatico", 2, "cancelacion", "2026-11-19",
      "La política de cancelación de los 8 tours (los 3 circuitos ya la traen).",
      "The cancellation policy for the 8 tours (the 3 circuits already include it)."),
    p("turismo-asiatico", 3, "calendario", "2026-11-19",
      "Confirmar las salidas en domingo y los vuelos internos Kuala Lumpur–Sandakan (quién los emite y a qué tarifa).",
      "Confirm Sunday departures and the Kuala Lumpur–Sandakan domestic flights (who issues them and at what fare)."),
    p("turismo-asiatico", 4, "pago", "2026-11-19",
      "Las incoherencias de almuerzo y horario en algunos tours que les detallamos en archivo aparte, y la foto del tour de Katong/Joo Chiat para publicarlo.",
      "The lunch and schedule inconsistencies in some tours detailed in a separate file, and the photo of the Katong/Joo Chiat tour so we can publish it."),
    p("turismo-asiatico", 5, "alta", "2026-11-19",
      "El acuerdo de intermediación para revisión y firma, datos legales (licencia KPL) y permiso de fotos con crédito.",
      "The intermediation agreement for review and signature, legal details (KPL licence) and photo permission with credit."),
  ],
};

/** Montos, porcentajes, cuentas y datos fiscales no viajan en una pregunta (plan §8; REQ-10718: netos solo en el Proyecto). */
// REQ-10813
export function sinMontos(texto: string): boolean {
  const monto = /(\$|€|£|\b(?:USD|EUR|MXN|THB|RMB|CNY|PEN|COP|MYR|SGD))\s*\d|\d\s*(?:USD|EUR|MXN|THB|RMB|CNY|PEN|COP|MYR|SGD|por ciento|percent)\b|\d\s*%/i;
  const cuenta = /\b\d{7,}\b|\b(?:cuenta|account|IBAN|SWIFT|CLABE)\b[^.]*\d{4,}/i;
  const fiscal = /\b(?:RFC|RUT|CLABE|IBAN|SWIFT|NIT|CURP)\b/;
  return !monto.test(texto) && !cuenta.test(texto) && !fiscal.test(texto);
}

const q = (v: string): string => `'${v.replace(/'/g, "''")}'`;

/** Un UPDATE por proveedor, solo `preguntas` y `updatedAt`, y solo si sigue publicado. Nada se inserta ni se borra. */
// REQ-10813
export function sqlCargaPreguntas(carga: Partial<Record<string, Pregunta[]>>, hoyIso: string): string {
  const ahora = /^\d{4}-\d{2}-\d{2}$/.test(hoyIso) ? `${hoyIso}T00:00:00.000+00:00` : hoyIso;
  return Object.entries(carga)
    .filter((e): e is [string, Pregunta[]] => Array.isArray(e[1]))
    .map(([id, lista]) => `UPDATE "Proveedor" SET "preguntas" = ${q(JSON.stringify(lista))}, "updatedAt" = ${q(ahora)} WHERE "id" = ${q(id)} AND "publicado" = 1;`)
    .join("\n");
}

/** Punto de regreso: respaldo de solo lectura antes y, si hace falta, la columna vuelve a '[]' (REQ-10649). */
// REQ-10813
export function sqlRegresoPreguntas(ids: readonly string[]): { respaldo: string; regreso: string } {
  return {
    respaldo: `SELECT "id", "preguntas" FROM "Proveedor" WHERE "id" IN (${ids.map(q).join(", ")});`,
    regreso: ids.map((id) => `UPDATE "Proveedor" SET "preguntas" = '[]' WHERE "id" = ${q(id)};`).join("\n"),
  };
}

/**
 * Antes de cargar: cada proveedor existe y está publicado en el directorio, su columna sigue vacía (no se pisa lo
 * cargado; cerrar preguntas conserva el historial, G3-A) y ningún texto trae montos. Devuelve los motivos; vacío = ok.
 */
// REQ-10813
export function validarCarga(carga: Partial<Record<string, Pregunta[]>>, directorio: readonly Pick<ProveedorSemilla, "id" | "publicado">[], actuales: Record<string, string | null | undefined>): string[] {
  const motivos: string[] = [];
  for (const [id, lista] of Object.entries(carga)) {
    if (!lista) continue;
    const d = directorio.find((x) => x.id === id);
    if (!d || !d.publicado) motivos.push(`${id}: no está publicado en el directorio`);
    const actual = (actuales[id] ?? "[]").trim();
    if (actual && actual !== "[]") motivos.push(`${id}: ya tiene preguntas cargadas; no se pisan`);
    for (const pr of lista) if (!sinMontos(pr.es) || !sinMontos(pr.en)) motivos.push(`${pr.id}: trae un monto, porcentaje, cuenta o dato fiscal`);
  }
  return motivos;
}

// REQ-10813
export function resumenPreguntas(carga: Partial<Record<string, Pregunta[]>>): { proveedores: number; total: number; porProveedor: Record<string, number>; porTema: Partial<Record<Tema, number>> } {
  const porProveedor: Record<string, number> = {};
  const porTema: Partial<Record<Tema, number>> = {};
  let total = 0;
  for (const [id, lista] of Object.entries(carga)) {
    if (!lista) continue;
    porProveedor[id] = lista.length;
    total += lista.length;
    for (const pr of lista) porTema[pr.tema] = (porTema[pr.tema] ?? 0) + 1;
  }
  return { proveedores: Object.keys(porProveedor).length, total, porProveedor, porTema };
}
