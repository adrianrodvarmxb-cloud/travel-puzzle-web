/**
 * REQ-10543 (PO, 13 nov 2026 23:15: «pues convierte tú aquí a dólares» / «¿o qué hacen los referentes?»).
 * Tangol devuelve a veces la moneda de la tarifa con el código numérico 1 en lugar de «USD»: 23 tours de AR, BO,
 * BR, CL, EC y UY quedaron con `priceCurrency = '1'` y montos en dólares (traslado de Montevideo 18, La Paz 25,
 * Ecuador usa el dólar). Como hacen los referentes, se normaliza el código con un mapa explícito y NO se convierte
 * ningún monto (el sitio ya muestra el aproximado en MXN con Banxico a partir de USD). Lo que no está en el mapa ni
 * es un ISO de 3 letras no se adivina: devuelve null y el tour se descarta («moneda-desconocida»). Pura.
 */

/** Códigos propios de Tangol confirmados con datos reales. Agregar uno nuevo solo con evidencia. */
// REQ-10543
export const TANGOL_CURRENCY_CODES: Readonly<Record<string, string>> = Object.freeze({ "1": "USD" });

const ISO_4217 = /^[A-Z]{3}$/;

// REQ-10543
export function normalizeCurrency(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const v = String(raw).trim().toUpperCase();
  if (!v) return null;
  if (TANGOL_CURRENCY_CODES[v]) return TANGOL_CURRENCY_CODES[v];
  return ISO_4217.test(v) ? v : null;
}
