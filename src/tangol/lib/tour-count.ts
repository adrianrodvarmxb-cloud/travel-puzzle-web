/**
 * REQ-3505: el cuadre de tours de Tangol. Puro.
 *
 * El inventario del 11 nov 2026 dijo 2,237 tours (suma del `ToursQty` de cada PAÍS de
 * `GetTourCountries`) y la lista real del 12 nov devolvió 2,059 (suma de `GetTourListByDestination`).
 * Nadie comparaba las dos cifras. Aquí se compara, destino por destino, lo que el destino declara
 * (`ToursQty` de `GetTourDestinations`) contra lo que llegó en su lista, para que una diferencia
 * nunca vuelva a pasar callada.
 */

export interface DestinationCount {
  id: number;
  name: string;
  /** `ToursQty` del destino; `null` = Tangol no lo mandó. */
  declarados: number | null;
  /** Tours que pasaron la validación en la lista del destino. */
  recibidos: number;
  /** Tours de la lista que tiró la validación (Zod): llegaron, pero malos. */
  invalidos: number;
  /** La lista del destino falló: no hay con qué comparar. */
  fallo?: boolean;
}

export interface TourCountCheck {
  /** Suma de `ToursQty` de los destinos comparables. */
  declarados: number;
  /** Suma de tours válidos que llegaron en esos destinos. */
  recibidos: number;
  invalidos: number;
  /** recibidos + invalidos − declarados. Negativo = faltan tours en la lista. */
  diferencia: number;
  /** Destinos sin `ToursQty` usable: no entran a la cifra. */
  sinDato: number;
  /** Destinos cuya lista falló: no entran a la cifra. */
  sinLista: number;
  /** Destinos que no cuadran, de mayor a menor diferencia absoluta. */
  destinos: (Omit<DestinationCount, "fallo"> & { diferencia: number })[];
}

const usable = (n: number | null | undefined): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

// REQ-3505
export function checkTourCounts(entries: readonly DestinationCount[]): TourCountCheck {
  const out: TourCountCheck = { declarados: 0, recibidos: 0, invalidos: 0, diferencia: 0, sinDato: 0, sinLista: 0, destinos: [] };
  for (const e of entries) {
    if (e.fallo) { out.sinLista++; continue; }
    if (!usable(e.declarados)) { out.sinDato++; continue; }
    out.declarados += e.declarados;
    out.recibidos += e.recibidos;
    out.invalidos += e.invalidos;
    const diferencia = e.recibidos + e.invalidos - e.declarados;
    if (diferencia !== 0) {
      out.destinos.push({ id: e.id, name: e.name, declarados: e.declarados, recibidos: e.recibidos, invalidos: e.invalidos, diferencia });
    }
  }
  out.diferencia = out.recibidos + out.invalidos - out.declarados;
  out.destinos.sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia) || a.id - b.id);
  return out;
}

/** La línea del reporte. Números sin formato de idioma (render determinista, INC-001). */
// REQ-3505
export function formatTourCountCheck(c: TourCountCheck): string {
  const parts = [
    `Cuadre de tours: el destino dice ${c.declarados}`,
    `llegaron en la lista ${c.recibidos}${c.invalidos ? ` (+${c.invalidos} tirados por validación)` : ""}`,
    `diferencia ${c.diferencia}`,
    c.destinos.length ? `NO CUADRA en ${c.destinos.length} destino(s)` : "cuadra",
  ];
  if (c.sinDato) parts.push(`${c.sinDato} destino(s) sin ToursQty`);
  if (c.sinLista) parts.push(`${c.sinLista} destino(s) sin lista por error`);
  return parts.join(" · ");
}

/** Detalle por destino que no cuadra, para el log de la corrida. */
// REQ-3505
export function formatTourCountDetail(c: TourCountCheck, max = 50): string[] {
  return c.destinos
    .slice(0, max)
    .map((d) => `  destino ${d.id} «${d.name}»: dice ${d.declarados}, llegaron ${d.recibidos}${d.invalidos ? ` (+${d.invalidos} tirados)` : ""} → ${d.diferencia}`);
}
