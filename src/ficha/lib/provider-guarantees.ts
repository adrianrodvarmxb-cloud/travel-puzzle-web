/**
 * REQ-10889 · Garantías por proveedor (REQ-10888, decisión del PO del 26-11-2026: «Solo las del proveedor»; petición
 * literal: «ese contrato de Profeco realmente cubre un viaje que nosotros estamos ofreciendo por medio de otro
 * proveedor… ahí tendrían que aparecer las garantías que ofrece cada uno de los proveedores»). Reemplaza, en los viajes
 * de agencia, el §L «circuito» de REQ-10804 (PROFECO 6635-2023) por lo que ofrece cada proveedor según sus datos.
 * - Los datos salen de los expedientes del Proyecto («Expediente de proveedor», REQ-10717); cada uno lleva su fuente.
 *   Sin dato de un proveedor, no hay texto (nunca «N/D» ni texto genérico): solo el enlace a /terminos.
 * - Los textos son propuesta: pasan por el abogado antes de encender `FICHA_PROVIDER_GUARANTEES_ENABLED` (§L es suyo).
 * - Nunca el neto, el margen ni datos de cuenta. La versión en español es la vinculante (§J); en inglés, traducción.
 * - Puro: sin I/O, sin banderas y sin reloj.
 */
import type { FichaLang, FichaModel } from "./model";

export type ProviderGuaranteeId = "deposito" | "cancelacion" | "reembolso" | "minimo" | "no-show" | "reclamaciones";

export interface ProviderGuaranteeFact {
  id: ProviderGuaranteeId;
  text: { es: string; en: string };
  /** De dónde sale (expediente y documento del proveedor). Nunca llega al navegador. */
  source: string;
}

/**
 * Hechos por proveedor, por `agencyId` del import (`ag-…`) o `providerId` de `Tour`. Solo lo que consta en su expediente.
 * Fuentes:
 * - `ag-tas` Turismo Asiático: `proveedores/turismo-asiatico-expediente-2026-11-15.md` §4 (T&C generales 2026 del
 *   proveedor, correo de Sergi Matas del 6-11-2026, adjunto «2026 T&C Turismo Asiatico.pdf»).
 * - `ag-fch` Fantástica China: `proveedores/fantastica-china-expediente-2026-11-15.md` §4 y §5 (tarifario p. 122
 *   numeral 18, confirmado por Beibei el 12-11-2026; la política por viaje ya viene en `cancellation` del modelo).
 * - `ag-bbt` Big Bus Tours: `proveedores/big-bus-tours-expediente-2026-11-15.md` §4 (REQ-3425, PO 14-11-2026).
 * Sin fila: Exotic Escapes, Destino Colombia, Inca World, Extime (sus expedientes no traen garantía propia; solo T&C).
 */
export const PROVIDER_GUARANTEES: Readonly<Record<string, readonly ProviderGuaranteeFact[]>> = {
  "ag-tas": [
    {
      id: "deposito",
      text: {
        es: "Para confirmar, el operador pide un depósito no reembolsable de entre el 30 % y el 50 % del total, según la anticipación y los servicios; el resto se paga al menos 30 días antes del viaje.",
        en: "To confirm, the operator requires a non-refundable deposit of 30 % to 50 % of the total, depending on notice and services; the balance is due at least 30 days before the trip.",
      },
      source: "proveedores/turismo-asiatico-expediente-2026-11-15.md §4 · T&C 2026, «Reserva del Viaje y Plazos de Pagos»",
    },
    {
      id: "cancelacion",
      text: {
        es: "Cancelación por escrito: hasta 30 días antes se cobra el 30 % del total; de 15 a 29 días, el 70 %; con menos de 15 días, el 100 %.",
        en: "Written cancellation: up to 30 days before, 30 % of the total is charged; 15 to 29 days before, 70 %; under 15 days, 100 %.",
      },
      source: "proveedores/turismo-asiatico-expediente-2026-11-15.md §4 · T&C 2026, «Políticas de Cancelación»",
    },
    {
      id: "reembolso",
      text: {
        es: "Si el operador cancela o cambia lo esencial del viaje (fuerza mayor o grupo mínimo no alcanzado), eliges entre el reembolso de lo abonado o aceptar los cambios.",
        en: "If the operator cancels or materially changes the trip (force majeure or minimum group not reached), you choose between a refund of what you paid or accepting the changes.",
      },
      source: "proveedores/turismo-asiatico-expediente-2026-11-15.md §4 · T&C 2026, «Cancelación o Modificaciones de itinerario por parte de la agencia»",
    },
    {
      id: "reclamaciones",
      text: {
        es: "Cualquier incidencia en destino se comunica por escrito al operador dentro de las primeras 24 horas para que pueda resolverla en el momento.",
        en: "Any issue at the destination must be reported in writing to the operator within the first 24 hours so it can be solved on the spot.",
      },
      source: "proveedores/turismo-asiatico-expediente-2026-11-15.md §4 · T&C 2026, «Reclamaciones en Destino»",
    },
  ],
  "ag-fch": [
    {
      id: "cancelacion",
      text: {
        es: "Devolución del 100 %, 90 %, 80 %, 70 % o 50 % según canceles con 46, 30, 17, 11 o 3 días de anticipación; sin devolución con menos de 3 días.",
        en: "Refund of 100 %, 90 %, 80 %, 70 % or 50 % when cancelling 46, 30, 17, 11 or 3 days in advance; no refund under 3 days.",
      },
      source: "proveedores/fantastica-china-expediente-2026-11-15.md §4 · tarifario p. 122 numeral 18 (Beibei, 12-11-2026)",
    },
    {
      id: "reembolso",
      text: {
        es: "El operador no cambia las tarifas contratadas, salvo variación del tipo de cambio USD/RMB o reservas de última hora.",
        en: "The operator does not change contracted rates, except for USD/RMB exchange-rate changes or last-minute bookings.",
      },
      source: "proveedores/fantastica-china-expediente-2026-11-15.md §5 (REQ-1675)",
    },
  ],
  "ag-bbt": [
    {
      id: "reembolso",
      text: {
        es: "Si cancelas a tiempo, el reembolso es total, igual que el operador nos lo devuelve.",
        en: "If you cancel in time, the refund is in full, just as the operator refunds us.",
      },
      source: "proveedores/big-bus-tours-expediente-2026-11-15.md §4 (REQ-3425, PO 14-11-2026)",
    },
  ],
};

export interface ProviderGuarantee { id: `proveedor-${ProviderGuaranteeId}`; text: string }

/** Garantías del proveedor de la ficha, en su idioma (es vinculante; en traducción; el resto cae a es). [] sin dato. */
// REQ-10889
export function providerGuaranteesFor(f: Pick<FichaModel, "providerId" | "lang">, table: Readonly<Record<string, readonly ProviderGuaranteeFact[]>> = PROVIDER_GUARANTEES): ProviderGuarantee[] {
  const key = (f.providerId ?? "").trim().toLowerCase();
  if (!key) return [];
  const facts = table[key] ?? [];
  const lang: FichaLang = f.lang === "en" ? "en" : "es";
  return facts.filter((x) => x.text[lang]?.trim()).map((x) => ({ id: `proveedor-${x.id}`, text: x.text[lang].trim() }));
}
