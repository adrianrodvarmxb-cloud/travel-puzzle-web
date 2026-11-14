/**
 * Marca que vende y operador en destino (decisión 38 del plan de la ficha única, REQ-10615; código REQ-10651).
 * Reemplaza REQ-10542 (operador en la casilla Proveedor): la marca que vende es Travel Puzzle y el operador
 * se dice en un lugar discreto, la línea «Opera en destino» de la ficha.
 * Pura: sin I/O, sin reloj y sin idioma. El dato no cambia (Tour.providerTitle sigue guardando al operador);
 * solo cambia dónde se muestra.
 */
export const SELLER_BRAND = "Travel Puzzle";

/**
 * Proveedores cuya ficha sigue mostrando a su operador como hoy. El primer proveedor (tours con providerId
 * "freetour" o sin providerId) no cambia hasta su revisión de cumplimiento (plan, punto abierto 1).
 */
const KEEPS_OPERATOR_VISIBLE = new Set(["freetour"]);

const keeps = (providerId: string | null | undefined): boolean => !providerId?.trim() || KEEPS_OPERATOR_VISIBLE.has(providerId.trim());
const name = (operator: string | null | undefined): string | null => operator?.trim() || null;

/** Casilla «Proveedor» y tarjeta lateral: la marca que vende. */
// REQ-10651
export function sellerFor(providerId: string | null | undefined, operator: string | null | undefined): string | null {
  return keeps(providerId) ? name(operator) : SELLER_BRAND;
}

/** Texto de la línea discreta «Opera en destino: …»; null si no aplica o no hay dato. */
// REQ-10651
export function operatorLine(providerId: string | null | undefined, operator: string | null | undefined): string | null {
  return keeps(providerId) ? null : name(operator);
}

/** Operador que se nombra bajo el título; null = no se nombra. */
// REQ-10651
export function underTitleOperator(providerId: string | null | undefined, operator: string | null | undefined): string | null {
  return keeps(providerId) ? name(operator) : null;
}

/** ¿«En breve» nombra al operador? */
// REQ-10651
export function operatorInBrief(providerId: string | null | undefined): boolean {
  return keeps(providerId);
}
