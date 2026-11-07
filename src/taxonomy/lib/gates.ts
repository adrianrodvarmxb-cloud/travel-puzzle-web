/**
 * REQ-260: gates de la taxonomía (docs/plan-taxonomia.md §7.2 y docs/taxonomia.md §10), una constante por gate.
 * Todos «firmado por recomendación, PO 6-11 07:04» (aviso del coordinador). Cambiar una opción = PR con OK del PO;
 * los tests muestran qué cambia.
 * Puro: las funciones de lib/ reciben estos valores por parámetro (`gates`) y usan estos solo como default.
 */
import { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS } from "@/tours/lib/favorite";

/** G2 · Qué es «Caminata». A: tour guiado a pie de pago (free a pie = Free tour). B: todo lo que es a pie, incluido el free tour. C: senderismo (hikes). */
export const GATE_G2_CAMINATA: "A" | "B" | "C" = "A";

/** G3 · Lista de temas. A: los 13 temas depurados (§4.2). B: los 26 términos de 2024 tal cual. C: 8 temas mínimos. El diccionario trae la A. */
export const GATE_G3_TEMAS: "A" | "B" | "C" = "A";

/** G-T1 · Favorito de los viajeros. A: ≥4.7 y ≥50 (reemplazada). B: ≥4.7 y ≥20. C: ≥4.7 y ≥100. D: la regla única del sitio (REQ-1248). */
/** REQ-1248 (PO, 7 nov 2026, 08:14): D = la regla única del sitio (src/tours/lib/favorite.ts, ≥4.9 y ≥180; D13). Reemplaza a A. */
export const GATE_GT1_FAVORITO: "A" | "B" | "C" | "D" = "D";
export const FAVORITO_CRITERIO = {
  A: { minCalificacion: 4.7, minResenas: 50 }, B: { minCalificacion: 4.7, minResenas: 20 }, C: { minCalificacion: 4.7, minResenas: 100 },
  D: { minCalificacion: FAVORITE_MIN_RATING, minResenas: FAVORITE_MIN_REVIEWS }, // REQ-1248
} as const;

/** G-T2 · México en /destinos. A: bloque propio antes de América del Norte. B: dentro de América del Norte (como hoy). C: Nacional/Internacional. Sin efecto en T1. */
export const GATE_GT2_MEXICO: "A" | "B" | "C" = "A";

/** G-T3 · Metas de las métricas (REQ-432). Se usan en T9. */
export const GATE_GT3_METAS = {
  pctConFormato: 100,
  pctPresencialesSinTemaMax: 5,
  categoriasPorRevisarMax: 0,
  precisionTemaMin: 90,
  chipsEnCeroMax: 0,
  usoFiltros: "medir 4 semanas y luego fijar meta",
} as const;

/** G-T4 · Franja horaria. A: sigue tras bandera (el sync no guarda la hora). B: se descarta. */
export const GATE_GT4_FRANJA: "A" | "B" = "A";

/** G-T5 · Dónde vive la clasificación. A: 3 tablas propias (0017). B: columnas en Tour/Trip. C: en memoria. Sin efecto en T1. */
export const GATE_GT5_ALMACEN: "A" | "B" | "C" = "A";

/** G-T7 · Excursión por duración. A: ≥360 min con palabra de salida en el título. B: solo ≥360 min. */
export const GATE_GT7_EXCURSION: "A" | "B" = "A";
export const EXCURSION_MIN_MINUTOS = 360;
export const CIRCUITO_MIN_MINUTOS = 1440;

/** G-T8 · Dificultad 1–5 desde los 3 valores de hoy. A: facil→2, moderada→3, exigente→4. B: no mostrar nada hasta que cada DMC dé la escala. */
export const GATE_GT8_DIFICULTAD: "A" | "B" = "A";
export const DIFICULTAD_DESDE_GESTOR = { facil: 2, moderada: 3, exigente: 4 } as const;

/** G-T9 (opcional) · Title de la ficha por formato. A: «{título real} – Excursión desde {Ciudad}» en excursion-dia (cambia REQ-099). B: se queda el patrón firmado. Se usa en T5. */
export const GATE_GT9_TITLE: "A" | "B" = "A";

/** G-T10 · `por-revisar`. A: no se publica en ningún lado. B: visible solo en /tours. */
export const GATE_GT10_POR_REVISAR: "A" | "B" = "A";

/** G-T11 · Autoguiado en el carrito. A: `tour`. B: `tickets`. */
export const GATE_GT11_AUTOGUIADO: "A" | "B" = "A";

/**
 * D-T1 (decisión de lectura, para firma): las reglas por palabra de §4.1 (traslado y entradas en 13/14, «hop-on»)
 * van ANTES de Free tour, como dice la precedencia homologada y la muestra del plan. Con `false`, un tour de precio 0
 * en una categoría que no está en las 10 excepciones siempre es Free tour (lectura literal de REQ-406).
 */
export const REGLAS_POR_PALABRA_ANTES_DE_FREE = true;

type AB = "A" | "B";
type ABC = "A" | "B" | "C";
export interface Gates {
  caminata: ABC;
  favorito: ABC | "D"; // REQ-1248
  excursion: AB;
  dificultad: AB;
  porRevisar: AB;
  autoguiadoCarrito: AB;
  palabrasAntesDeFree: boolean;
  /** Bandera de atributos sin dato (REQ-417); llega de fuera, nunca de process.env aquí. */
  atributosExtra: boolean;
}

export const DEFAULT_GATES: Gates = {
  caminata: GATE_G2_CAMINATA,
  favorito: GATE_GT1_FAVORITO,
  excursion: GATE_GT7_EXCURSION,
  dificultad: GATE_GT8_DIFICULTAD,
  porRevisar: GATE_GT10_POR_REVISAR,
  autoguiadoCarrito: GATE_GT11_AUTOGUIADO,
  palabrasAntesDeFree: REGLAS_POR_PALABRA_ANTES_DE_FREE,
  atributosExtra: false,
};

/** G-T10: dónde puede verse un producto `por-revisar`. */
export function porRevisarVisibleEn(gate: Gates["porRevisar"]): readonly string[] {
  return gate === "A" ? [] : ["/tours"];
}
