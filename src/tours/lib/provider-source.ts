/**
 * REQ-10578 (INC-021): las reseñas, los eventos y la ficha en vivo de FREETOUR se consultan por el número
 * del tour EN FREETOUR. Los números se repiten entre proveedores (79 números compartidos con Tangol el 14 nov
 * 2026), así que un tour de otro proveedor nunca debe consultar con el suyo: pintaba reseñas de otro tour.
 * Pura: devuelve el número a consultar o null si no toca consultar.
 */
// REQ-10578
export function freetourSourceId(providerId: string | null | undefined, externalId: number | null | undefined): number | null {
  if (providerId && providerId !== "freetour") return null;
  return typeof externalId === "number" && externalId > 0 ? externalId : null;
}
