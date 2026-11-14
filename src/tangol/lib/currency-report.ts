/** REQ-10510: línea del resumen del sync con la moneda pedida y las que Tangol devolvió. Pura. */
// REQ-10510
export function formatCurrencyReport(r: { monedaPedida: string; monedas: Record<string, number> }): string {
  const entries = Object.entries(r.monedas).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const devuelta = entries.length ? entries.map(([m, n]) => `${m}×${n}`).join(", ") : "(sin tarifas leídas)";
  const otra = entries.some(([m]) => m !== r.monedaPedida.toUpperCase());
  return `Moneda pedida a Tangol: ${r.monedaPedida} · devuelta: ${devuelta}${otra ? " · ::warning::Tangol devolvió otra moneda que la pedida" : ""}`;
}
