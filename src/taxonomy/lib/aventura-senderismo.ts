/**
 * REQ-10660 (decisión 9 de la ficha única, REQ-10588): aventura y senderismo con guía (caso Minitrekking). Hoy los tours
 * de «Excursiones de aventura» de Tangol (9000003) y «Tours de aventura» de FREETOUR (16) salen como «Momentos de autor»
 * con tema Aventura. El PO firmó que la caminata y el trekking con guía sean «Excursión de un día» con los temas Aventura
 * y Montaña y senderismo, y que la lista de cambios se le muestre antes de aplicarla. Este módulo da el veredicto por
 * título y arma la lista; no clasifica en producción hasta que el PO firme la lista (gate REQ-10661 no: ver docs).
 * Puro: sin D1, sin red.
 */
import { keywordRegex, norm } from "./text";
import { MAX_TEMAS, type Decision, type Formato, type Tema } from "./types";

export const PALABRAS_SENDERISMO = {
  /** La actividad es caminar: cambia. */
  actividad: ["trekking", "trek", "treking", "minitrekking", "senderismo", "caminata*", "hike", "hiking", "ascenso", "escalada", "montanismo"],
  /** Lugar de montaña: cambia solo si no hay otra actividad en el título. */
  lugar: ["cerro*", "volcan*", "glaciar*", "laguna*", "nevado*", "paramo", "cordillera", "montana*", "sierra"],
  /** Otra actividad de aventura: se queda como Momentos de autor con tema Aventura. */
  otraActividad: [
    "kayak*", "rafting", "pack rafting", "duckies", "canoa*", "canotaje", "navegacion", "velero", "barco", "4x4", "utv", "jeep", "quad*", "buggy*", "buggies",
    "bici*", "bike", "mountain bike", "cabalgata*", "buceo", "snorkel*", "surf", "parapente", "ala delta", "globo", "canopy", "tirolesa", "arborismo",
    "rappel", "pesca", "fly fishing", "safari", "husky", "boia cross", "barranquismo", "tuk", "juego de exploracion", "walking tour", "city tour",
  ],
  /** Fuera de la regla: el PO decide uno por uno. */
  duda: ["autoguiad*", "alquiler", "transfer", "crucero*", "dias", "d/", "expedicion*"],
} as const;

/** Un día o menos; desde 24 h es circuito y no entra a la regla (va a dudas). */
export const MAX_MINUTOS_UN_DIA = 1439;

/**
 * Firma vigente del PO a la lista (REQ-10661, 14 nov 2026): «Firmo, pero los 7 paseos sin senderismo». Estos siete
 * «lugar de montaña» son paseos, no caminata: cambian a Excursión de un día, pero con Aventura y Naturaleza.
 * Son títulos reales de la lista firmada; un título nuevo no entra aquí sin otra firma.
 */
export const PASEOS_SIN_SENDERISMO: readonly string[] = [
  "Laguna Del Toro Con Avistaje De Flamencos",
  "Full Day Piedras Rojas + Lagunas Altiplánicas Miscanti Y Miñiques + Laguna Chaxa + Salar De Atacama",
  "Laguna Baltinache O Lagunas Escondidas",
  "Tour De Dia Completo A Laguna De Los Pozuelos",
  "Nevado Pastoruri Y Puya Raimondi",
  "Cruzando La Cordillera",
  "Montañas Y Glaciares Del Tronador",
];
const limpio = (titulo: string): string => norm(titulo).replace(/\s+/g, " ").trim();
const PASEOS = new Set(PASEOS_SIN_SENDERISMO.map(limpio));
const MARCA_PASEO = "paseo sin caminata";

export type Veredicto = "cambia" | "queda" | "duda";
export interface VeredictoDecision9 {
  veredicto: Veredicto;
  /** Formato propuesto: `excursion-dia` si cambia; `experiencia-unica` si se queda; null en duda. */
  formato: Formato | null;
  temas: Tema[];
  regla: string;
}

const rx = {
  actividad: keywordRegex(PALABRAS_SENDERISMO.actividad)!,
  lugar: keywordRegex(PALABRAS_SENDERISMO.lugar)!,
  otra: keywordRegex(PALABRAS_SENDERISMO.otraActividad)!,
  duda: keywordRegex(PALABRAS_SENDERISMO.duda)!,
};

const QUEDA: VeredictoDecision9 = { veredicto: "queda", formato: "experiencia-unica", temas: ["aventura"], regla: "sin palabra de caminata: Momentos de autor con tema Aventura" };

export function veredictoDecision9(titulo: string, minutos: number | null): VeredictoDecision9 {
  const t = norm(titulo).replace(/\s+/g, " ").trim();
  // Los juegos de exploración de FREETOUR (cat. 16) se quedan: no son senderismo con guía aunque digan «autoguiado».
  if (/juego de exploracion|juego urbano/.test(t)) return { ...QUEDA, regla: "juego de exploración: Momentos de autor con tema Aventura" };
  if (minutos !== null && minutos > MAX_MINUTOS_UN_DIA) return { veredicto: "duda", formato: null, temas: [], regla: "más de un día: circuito, fuera de la regla" };
  const duda = t.match(rx.duda);
  if (duda) return { veredicto: "duda", formato: null, temas: [], regla: `palabra «${duda[1]}»: lo decide el PO` };
  const actividad = t.match(rx.actividad);
  if (actividad) return { veredicto: "cambia", formato: "excursion-dia", temas: ["aventura", "montana-senderismo"], regla: `caminata con guía («${actividad[1]}»)` };
  const otra = t.match(rx.otra);
  if (otra) return { ...QUEDA, regla: `otra actividad de aventura («${otra[1]}»): Momentos de autor con tema Aventura` };
  const lugar = t.match(rx.lugar);
  // REQ-10661 (firma vigente): los siete paseos cambian de tipo, pero sin el tema Montaña y senderismo.
  if (lugar && PASEOS.has(t)) return { veredicto: "cambia", formato: "excursion-dia", temas: ["aventura", "naturaleza"], regla: `lugar de montaña, ${MARCA_PASEO} («${lugar[1]}»)` };
  if (lugar) return { veredicto: "cambia", formato: "excursion-dia", temas: ["aventura", "montana-senderismo"], regla: `lugar de montaña sin otra actividad («${lugar[1]}»)` };
  return QUEDA;
}

export interface TourDecision9 { proveedor: string; ciudad: string | null; minutos: number | null; titulo: string }
export interface FilaDecision9 extends TourDecision9, VeredictoDecision9 {}
export type Conteo = Record<Veredicto, number>;
export interface PropuestaDecision9 { conteo: Conteo; porProveedor: Record<string, Conteo>; filas: FilaDecision9[] }

const cero = (): Conteo => ({ cambia: 0, queda: 0, duda: 0 });

/** Lista completa para la firma del PO: cada tour con su veredicto; nada se pierde ni se inventa. */
export function propuestaDecision9(tours: readonly TourDecision9[]): PropuestaDecision9 {
  const conteo = cero();
  const porProveedor: Record<string, Conteo> = {};
  const filas = tours.map((x) => {
    const v = veredictoDecision9(x.titulo, x.minutos);
    conteo[v.veredicto] += 1;
    (porProveedor[x.proveedor] ??= cero())[v.veredicto] += 1;
    return { ...x, ...v };
  });
  return { conteo, porProveedor, filas };
}

/** REQ-10662: la regla de formato que deja `classifyFormato` cuando decidió la decisión 9. */
export const REGLA_DECISION9 = "#8 decisión 9:";
export function esDecision9(reglaFormato: string): boolean {
  return reglaFormato.startsWith(REGLA_DECISION9);
}

/** REQ-10662: Aventura y Montaña y senderismo al frente, sin repetir y sin pasar del tope de temas. */
export function temasDecision9(temas: readonly Decision<Tema>[], reglaFormato = ""): Decision<Tema>[] {
  // REQ-10661 (firma vigente): un paseo lleva Aventura y Naturaleza y nunca Montaña y senderismo.
  const paseo = reglaFormato.includes(MARCA_PASEO);
  const frente: Tema[] = paseo ? ["aventura", "naturaleza"] : ["aventura", "montana-senderismo"];
  const fijos: Decision<Tema>[] = frente.map((t) => temas.find((x) => x.valor === t) ?? { valor: t, regla: "decisión 9 (REQ-10588)" });
  const resto = temas.filter((x) => !frente.includes(x.valor) && x.valor !== "montana-senderismo");
  return [...fijos, ...resto].slice(0, MAX_TEMAS);
}
