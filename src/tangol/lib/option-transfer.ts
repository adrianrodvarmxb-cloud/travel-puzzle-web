/**
 * REQ-10883 · Ola 12 (REQ-10636, PO 14-11-2026 06:01: «Tangol sí tiene, con transporte y sin transporte»). Tangol no
 * marca el traslado como campo: va en la descripción de la opción («Con traslado», «Sin traslado», «With transfer»,
 * «Without pickup»). Esta función lo lee para llenar `FichaOption.transferIncluded`; con duda, null (nunca se adivina).
 * Pura: solo texto.
 */

const WITH = /\b(con|with|incluye|includes?|including)\s+(?:hotel\s+)?(traslados?|transfers?|transporte|transportation|pick-?up|recogida)\b/i;
const WITHOUT = /\b(sin|without|no\s+incluye|not\s+included|excludes?)\s+(?:hotel\s+)?(traslados?|transfers?|transporte|transportation|pick-?up|recogida)\b/i;

// REQ-10883
export function transferFromDescription(description: string | null | undefined): boolean | null {
  const d = (description ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (!d) return null;
  const sin = WITHOUT.test(d);
  // «No incluye traslado» contiene «incluye traslado»: se quita lo negado antes de buscar lo afirmado.
  const con = WITH.test(d.replace(new RegExp(WITHOUT.source, "gi"), " "));
  if (con === sin) return null;
  return con;
}
