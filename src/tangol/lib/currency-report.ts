import { normalizeCurrency } from "./currency";

/**
 * REQ-10510: línea del resumen del sync con la moneda pedida y las que Tangol devolvió. Pura.
 * REQ-10543: muestra el código CRUDO que devolvió Tangol y, si no es ISO, a qué se normalizó («1×16 (=USD)») o que es
 * desconocido (esos tours se descartan con «moneda-desconocida»). Avisa solo si la moneda normalizada no es la pedida.
 */
// REQ-10510, REQ-10543
export function formatCurrencyReport(r: { monedaPedida: string; monedas: Record<string, number> }): string {
  const entries = Object.entries(r.monedas).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const nota = (m: string) => {
    if (m === "sin-moneda") return "";
    const iso = normalizeCurrency(m);
    if (!iso) return " (desconocida, se descarta)";
    return iso !== m ? ` (=${iso})` : "";
  };
  const devuelta = entries.length ? entries.map(([m, n]) => `${m}×${n}${nota(m)}`).join(", ") : "(sin tarifas leídas)";
  const otra = entries.some(([m]) => (normalizeCurrency(m) ?? m) !== r.monedaPedida.toUpperCase());
  return `Moneda pedida a Tangol: ${r.monedaPedida} · devuelta: ${devuelta}${otra ? " · ::warning::Tangol devolvió otra moneda que la pedida" : ""}`;
}
