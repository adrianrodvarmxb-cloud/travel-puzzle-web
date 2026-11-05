/** REQ-034: parte una lista en grupos de `size` (D1 acepta máx. 100 parámetros por consulta). Puro. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error("size debe ser >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
