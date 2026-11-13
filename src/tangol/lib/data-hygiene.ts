import type { TangolTour } from "./schemas";

/**
 * REQ-3504: basura del servidor de Tangol dentro de los datos. Pura.
 *
 * La corrida de solo lectura del 12 nov 2026 (REQ-3487, corrida 43303152904) trajo un tour con
 * `SubTypeCode` = `[METHOD ERROR 504]`: un error HTTP del lado de Tangol metido como si fuera un dato.
 * Un tour así se descarta entero (no se adivina el valor correcto) y se registra el campo.
 *
 * Los patrones son estrechos a propósito: la palabra «error» suelta dentro de un título («Escape Room
 * Error 404», «Los errores de la historia») NO es basura. Solo cuenta:
 *   - un bloque entre corchetes con ERROR/EXCEPTION o con un código HTTP 4xx/5xx, en cualquier parte del texto;
 *   - el valor ENTERO `null`, `undefined`, `error`, `exception` o un nombre de excepción (`TimeoutException`);
 *   - un texto que EMPIEZA con un nombre de excepción y dos puntos (`System.NullReferenceException: …`);
 *   - el mensaje de .NET «Object reference not set to an instance of an object»;
 *   - el valor ENTERO «504 Gateway Time-out» y demás frases estándar de HTTP 4xx/5xx.
 */

const BRACKETED = [
  /\[\s*(?:method\s+)?(?:error|exception)\b[^\]]*\]/i,
  /\[\s*(?:http\s*)?[45]\d{2}\s*\]/i,
];

const WHOLE_VALUE = [
  /^(?:null|undefined|error|exception)$/i,
  /^[\w.]*Exception$/,
  /^[\w.]*Exception\s*:/,
  /^(?:http\s*)?[45]\d{2}\s+(?:bad request|unauthorized|forbidden|not found|method not allowed|request time-?out|too many requests|internal server error|not implemented|bad gateway|service unavailable|gateway time-?out)\.?$/i,
];

const ANYWHERE = [/object reference not set to an instance of an object/i];

/** ¿Este texto tiene forma de error del proveedor? Un campo vacío (`null`, «») no lo es. */
// REQ-3504
export function isProviderErrorValue(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  return BRACKETED.some((re) => re.test(v)) || ANYWHERE.some((re) => re.test(v)) || WHOLE_VALUE.some((re) => re.test(v));
}

export interface ProviderErrorHit {
  field: string;
  value: string;
}

const detailText = (details: unknown, key: string): string | null => {
  if (!details || typeof details !== "object") return null;
  const v = (details as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
};

/**
 * REQ-3504: el primer campo de texto del tour que trae un error del proveedor, o `null` si está limpio.
 * Revisa título, tipo, subtipo, duración y los textos del detalle (descripción y resumen).
 */
// REQ-3504
export function findProviderErrorValue(tour: TangolTour): ProviderErrorHit | null {
  const fields: [string, string | null | undefined][] = [
    ["name", tour.name],
    ["typeCode", tour.typeCode],
    ["subTypeCode", tour.subTypeCode],
    ["duration", tour.duration],
    ["details.Description", detailText(tour.details, "Description")],
    ["details.ShortDescription", detailText(tour.details, "ShortDescription")],
  ];
  for (const [field, value] of fields) {
    if (isProviderErrorValue(value)) return { field, value: (value ?? "").trim() };
  }
  return null;
}
