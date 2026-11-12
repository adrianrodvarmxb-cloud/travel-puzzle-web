// REQ-1587: folios REQ únicos entre sesiones. Lógica pura: sin git, sin red, sin archivos.
// La reserva atómica la hace src/scripts/folio.ts: un commit en la rama folios/registro empujado sin force
// (si otra sesión empujó antes, GitHub lo rechaza por no ser fast-forward y se reintenta).

/** Desde este folio, todo REQ nuevo en una rama debe estar apartado en el registro (los anteriores ya existían). */
export const CORTE_RESERVA = 1588;

/** Rama donde vive el registro de folios apartados (un archivo; cada reserva es un commit fast-forward). */
export const RAMA_REGISTRO = "folios/registro";
export const ARCHIVO_REGISTRO = "folios.tsv";

/**
 * Registro compartido con escritura atómica (compare-and-swap): `escribir` solo gana si nadie más escribió
 * desde que se leyó `base`; si no, devuelve false y se vuelve a intentar con el registro nuevo.
 */
export interface Registro {
  leer: () => { texto: string; base: string | null };
  escribir: (texto: string, base: string | null) => boolean;
}

const FILA = /^\| (REQ-\d+) \|(.*)$/;

/** REQ-1587: folio → texto de sus dos primeras celdas (tipo y descripción), de cualquier tabla del archivo. */
export function leerFolios(md: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const linea of md.split("\n")) {
    const f = linea.match(FILA);
    if (!f) continue;
    const celdas = f[2].replace(/\\\|/g, " ").split("|").map((c) => c.trim());
    if (!m.has(f[1])) m.set(f[1], celdas.slice(0, 2).join(" "));
  }
  return m;
}

export function numero(id: string): number {
  return Number(id.replace(/^REQ-/, ""));
}

export function maxFolio(ids: Iterable<string>): number {
  let max = 0;
  for (const id of ids) max = Math.max(max, numero(id));
  return max;
}

function palabras(t: string): Set<string> {
  const limpio = t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/~~|`|\*\*/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ");
  return new Set(limpio.split(" ").filter((w) => w.length > 3));
}

/** Parecido entre dos textos (0 a 1) por palabras compartidas. */
export function parecido(a: string, b: string): number {
  const A = palabras(a);
  const B = palabras(b);
  if (A.size === 0 || B.size === 0) return 0;
  let comunes = 0;
  for (const w of A) if (B.has(w)) comunes++;
  return comunes / Math.min(A.size, B.size);
}

export interface Choque {
  id: string;
  rama: string;
  main: string;
}

/** REQ-1587: folios que la rama usa con otro tema distinto al que tienen en main. */
export function choques(rama: Map<string, string>, main: Map<string, string>, umbral = 0.5): Choque[] {
  const out: Choque[] = [];
  for (const [id, texto] of rama) {
    const enMain = main.get(id);
    if (enMain !== undefined && parecido(texto, enMain) < umbral) out.push({ id, rama: texto, main: enMain });
  }
  return out;
}

/** REQ-1587: folios nuevos (desde el corte) que no están apartados en GitHub. */
export function sinReserva(nuevos: Iterable<string>, reservados: Set<string>, corte = CORTE_RESERVA): string[] {
  return [...nuevos].filter((id) => numero(id) >= corte && !reservados.has(id));
}

/** REQ-1587: folios apartados en el registro (primera columna de cada línea). */
export function leerReservas(texto: string): Set<string> {
  return new Set(
    texto
      .split("\n")
      .map((l) => l.split("\t")[0].trim())
      .filter((id) => /^REQ-\d+$/.test(id)),
  );
}

/**
 * REQ-1587: aparta `n` folios seguidos desde el mayor de (`desde`, registro + 1).
 * Si otra sesión escribió el registro al mismo tiempo, relee y reintenta: nunca entrega un folio repetido.
 */
export function apartarFolios(
  n: number,
  desde: number,
  registro: Registro,
  datos: { rama: string; fecha: string; motivo: string },
  maxIntentos = 20,
): string[] {
  for (let intento = 0; intento < maxIntentos; intento++) {
    const { texto, base } = registro.leer();
    const tomados = leerReservas(texto);
    const ids: string[] = [];
    for (let k = Math.max(desde, maxFolio(tomados) + 1); ids.length < n; k++) {
      if (!tomados.has(`REQ-${k}`)) ids.push(`REQ-${k}`);
    }
    const lineas = ids.map((id) => [id, datos.rama, datos.fecha, datos.motivo.replace(/[\t\n]/g, " ")].join("\t"));
    const nuevo = (texto.endsWith("\n") || texto === "" ? texto : texto + "\n") + lineas.join("\n") + "\n";
    if (registro.escribir(nuevo, base)) return ids;
  }
  throw new Error(`REQ-1587: no se pudo apartar después de ${maxIntentos} intentos seguidos`);
}

/** REQ-1587: aparta un folio concreto si nadie lo tiene. */
export function apartarExacto(id: string, registro: Registro, datos: { rama: string; fecha: string; motivo: string }, maxIntentos = 20): boolean {
  for (let intento = 0; intento < maxIntentos; intento++) {
    const { texto, base } = registro.leer();
    if (leerReservas(texto).has(id)) return false;
    const linea = [id, datos.rama, datos.fecha, datos.motivo.replace(/[\t\n]/g, " ")].join("\t");
    const nuevo = (texto.endsWith("\n") || texto === "" ? texto : texto + "\n") + linea + "\n";
    if (registro.escribir(nuevo, base)) return true;
  }
  throw new Error(`REQ-1587: no se pudo apartar ${id} después de ${maxIntentos} intentos seguidos`);
}
