/**
 * REQ-10656 (decisión 12 de la ficha única, REQ-10591): la dificultad que un proveedor por API manda como texto libre
 * (Tangol: «Fácil», «<p>Baja</p>», «Dificultad: Media / Altura: 3.400 msnm.», párrafos enteros) cae en la escala 1–5
 * del diccionario (`circuito-dificultad`: 1 Relajado · 2 Ligero · 3 Moderado · 4 Exigente · 5 Muy exigente) por una
 * tabla de equivalencias que firma el PO (gate REQ-10657). Lo que la tabla no reconoce va a dudas y no se muestra.
 * Altura: misma regla firmada en REQ-1519 (2,500–3,499 m = 3; desde 3,500 m = 4; desde 4,500 m = 5); entre el término
 * y la altura manda el mayor. Puro: sin D1, sin red.
 */
import { keywordRegex, norm } from "./text";

export type Nivel = 1 | 2 | 3 | 4 | 5;

export interface FilaTabla {
  /** Nombre interno de la fila (sale en `regla` como `termino:<nombre>`). */
  nombre: string;
  nivel: Nivel;
  /** Frases ya normalizadas (minúsculas, sin acentos, separadores como espacio). `*` al final = prefijo. */
  palabras: readonly string[];
}

/**
 * Tabla propuesta para la firma del PO (REQ-10657). Las filas compuestas van primero: «media alta» debe ganar antes
 * de que «media» o «alta» decidan solas. Propuesta: «Alta» sola es 4 (Exigente); el 5 queda para «muy …» o 4,500 m.
 */
export const TABLA_DIFICULTAD_TANGOL: readonly FilaTabla[] = [
  { nombre: "muy-exigente", nivel: 5, palabras: ["muy alta", "muy alto", "muy exigente", "muy dificil", "extrema", "extremo"] },
  {
    nombre: "medio-alto",
    nivel: 4,
    palabras: [
      "media alta", "medio alto", "media a alta", "medio a alto", "moderado alto", "moderada alta", "moderado a alto",
      "moderado dificil", "moderada dificil", "medio dificil", "media dificil", "moderada y alta", "moderado y alto",
      "exigente alto", "alto exigente", "alta exigente",
    ],
  },
  {
    nombre: "ligero",
    nivel: 2,
    palabras: ["facil moderado", "facil a moderado", "facil moderada", "baja media", "bajo medio", "baja a media", "bajo moderado", "baja moderada", "bajo a moderado"],
  },
  { nombre: "exigente", nivel: 4, palabras: ["alta", "alto", "exigente", "dificil"] },
  { nombre: "moderado", nivel: 3, palabras: ["media", "medio", "mediano", "mediana", "moderado", "moderada", "intermedio", "intermedia"] },
  { nombre: "facil", nivel: 1, palabras: ["facil", "facii", "baja", "bajo", "leve", "para toda la familia", "no necesita", "sin dificultad", "basica", "basico"] },
];

/** Filas que son un solo término: si en una cabeza coinciden dos filas distintas de estas, es duda. */
const FILAS_SIMPLES = new Set(["exigente", "moderado", "facil"]);

/** Largo máximo (ya normalizado) de una cabeza sin etiqueta para confiar en el término que trae. */
export const CABEZA_MAX = 40;

export interface Equivalencia {
  /** Nivel 1–5, o null cuando es duda. */
  nivel: Nivel | null;
  /** `termino:<fila>`, `altura` (la altura subió o puso el nivel) o `duda`. */
  regla: string;
  /** Texto del proveedor limpio (sin HTML ni viñetas), acotado, para la lista de dudas. */
  texto: string;
  /** Altura en metros si el texto la trae. */
  altura: number | null;
}

const ENTIDADES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** Quita HTML, entidades, viñetas y asteriscos al inicio de cada línea; colapsa espacios. Conserva acentos. */
export function limpiarDificultad(texto: string): string {
  const sinHtml = texto
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e.toLowerCase()] ?? " ");
  return sinHtml
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^[\s\-*•·⚠️]+/u, "").replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

/** REQ-1519: 2,500–3,499 m = 3; desde 3,500 m = 4; desde 4,500 m = 5; menos de 2,500 m no suma nada. */
export function nivelPorAltura(metros: number | null): Nivel | null {
  if (metros === null || !Number.isFinite(metros)) return null;
  if (metros >= 4500) return 5;
  if (metros >= 3500) return 4;
  if (metros >= 2500) return 3;
  return null;
}

function alturaEnTexto(normalizado: string): number | null {
  const m = normalizado.match(/altura[^\d\n]{0,40}?(\d{1,2}[.,]\d{3}|\d{3,4})\s*(?:msnm|mts|m\b|metros)/);
  if (!m) return null;
  const n = Number.parseInt(m[1].replace(/[.,]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

const ETIQUETA = /^(?:grado de dificultad|nivel de dificultad|dificultad fisica|dificultad|nivel)\s*:?\s*/;

/** La cabeza: lo que queda tras la etiqueta, hasta el primer punto, salto, dos puntos, paréntesis o «altura». */
function cabezaDe(normalizado: string): { cabeza: string; conEtiqueta: boolean } {
  const conEtiqueta = ETIQUETA.test(normalizado);
  const sinEtiqueta = normalizado.replace(ETIQUETA, "");
  const corte = sinEtiqueta.search(/[.\n:(]| altura\b/);
  const cabeza = (corte === -1 ? sinEtiqueta : sinEtiqueta.slice(0, corte))
    .replace(/[/,\-–—;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { cabeza, conEtiqueta };
}

function filaDe(cabeza: string): FilaTabla | null | "ambigua" {
  const simplesVistas: FilaTabla[] = [];
  for (const fila of TABLA_DIFICULTAD_TANGOL) {
    const rx = keywordRegex(fila.palabras);
    if (!rx || !rx.test(cabeza)) continue;
    if (!FILAS_SIMPLES.has(fila.nombre)) return fila;
    simplesVistas.push(fila);
  }
  if (simplesVistas.length === 1) return simplesVistas[0];
  return simplesVistas.length === 0 ? null : "ambigua";
}

/**
 * Texto libre del proveedor → equivalencia. `null` cuando no hay texto (sin dato, no duda).
 * Un término se acepta si viene con etiqueta («Dificultad: …») o si la cabeza es corta (≤ CABEZA_MAX); si no, duda.
 */
export function dificultadDesdeTexto(texto: string | null | undefined): Equivalencia | null {
  if (typeof texto !== "string") return null;
  const limpio = limpiarDificultad(texto);
  if (limpio.length === 0) return null;
  const normalizado = norm(limpio).replace(/\s+/g, " ").trim();
  const altura = alturaEnTexto(normalizado);
  const porAltura = nivelPorAltura(altura);
  const { cabeza, conEtiqueta } = cabezaDe(normalizado);
  const fila = conEtiqueta || cabeza.length <= CABEZA_MAX ? filaDe(cabeza) : null;
  const acotado = limpio.length > 200 ? `${limpio.slice(0, 197)}…` : limpio;

  if (fila && fila !== "ambigua") {
    const sube = porAltura !== null && porAltura > fila.nivel;
    return { nivel: sube ? porAltura : fila.nivel, regla: sube ? "altura" : `termino:${fila.nombre}`, texto: acotado, altura };
  }
  if (fila === null && porAltura !== null && cabeza.length === 0) {
    return { nivel: porAltura, regla: "altura", texto: acotado, altura };
  }
  return { nivel: null, regla: "duda", texto: acotado, altura };
}

export interface ConteoTexto { texto: string | null; n: number }
export interface FilaResumen extends ConteoTexto { nivel: Nivel | null; regla: string | null }
export interface ResumenDificultad {
  porNivel: Record<Nivel, number>;
  sinDato: number;
  dudas: ConteoTexto[];
  filas: FilaResumen[];
}

/** Conteos por texto distinto (como los da `GROUP BY difficulty`) → resumen por nivel, dudas y filas, sin inventar niveles. */
export function resumenDificultad(conteos: readonly ConteoTexto[]): ResumenDificultad {
  const porNivel: Record<Nivel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sinDato = 0;
  const dudas: ConteoTexto[] = [];
  const filas: FilaResumen[] = [];
  for (const c of conteos) {
    const eq = dificultadDesdeTexto(c.texto);
    if (!eq) { sinDato += c.n; filas.push({ ...c, nivel: null, regla: null }); continue; }
    filas.push({ ...c, nivel: eq.nivel, regla: eq.regla });
    if (eq.nivel === null) dudas.push({ texto: c.texto, n: c.n });
    else porNivel[eq.nivel] += c.n;
  }
  dudas.sort((a, b) => b.n - a.n);
  return { porNivel, sinDato, dudas, filas };
}
