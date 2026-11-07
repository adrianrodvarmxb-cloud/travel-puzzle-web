/**
 * Taxonomía T1 (plan: docs/plan-taxonomia.md, PR #143). Tipos del diccionario, los mapeos y el clasificador.
 * Solo tipos y listas cerradas: sin I/O.
 */

/** Eje A. 14 formatos + 2 estados (`fuera`, `por-revisar`). El orden NO es la precedencia (esa vive en el diccionario). */
export const FORMATOS = [
  "pieza-libre", "caminata", "tour", "excursion-dia", "circuito", "experiencia-unica", "entradas", "autoguiado",
  "transporte", "traslado", "a-la-medida", "alquiler", "crucero",
  "visita-guiada", // REQ-1250
  "en-linea", // REQ-1262 (PO, 7-11 11:3x): experiencias realmente en línea (FREETOUR cat. 8)
  "esenciales-viaje", // REQ-1263: FREETOUR cat. 31 (servicios de viaje), tras bandera (decisión B del PO, 7-11 08:01): el «tour» de #11 se parte en Tour y Visita guiada
] as const;
export const ESTADOS_FORMATO = ["fuera", "por-revisar"] as const;
export type Formato = (typeof FORMATOS)[number];
export type FormatoOEstado = Formato | (typeof ESTADOS_FORMATO)[number];

/** Eje B. 13 temas (gate G3, opción A). */
export const TEMAS = [
  "gastronomia", "naturaleza", "montana-senderismo", "aventura", "playa-mar", "cultural", "religioso", "urbano",
  "noche-espectaculos", "bienestar", "talleres-aprendizaje", "deportivo", "parques-ocio",
] as const;
export type Tema = (typeof TEMAS)[number];
export const MAX_TEMAS = 3;

/** Estados de publicación de un término (pedido del PO, punto 1). `por_firmar` solo marca copy, no términos. */
export const ESTADOS_TERMINO = ["activo", "muestra", "tras_bandera", "oculto", "descartado"] as const;
export type EstadoTermino = (typeof ESTADOS_TERMINO)[number];

/** Dónde vive cada formato: Experiencias (menú, firmado), Traslados (firmado: transporte y traslados fuera de Experiencias) o en ningún lado. */
export const SECCIONES = ["experiencias", "traslados", "ninguna"] as const;
export type Seccion = (typeof SECCIONES)[number];

export const MEDIOS = ["bici", "barco", "vehiculo", "a-pie"] as const;
export type Medio = (typeof MEDIOS)[number];

/** Lo que sabe el clasificador de un producto. Todo opcional salvo proveedor, categoría y título. */
export interface ClassifyInput {
  /** Id del mapeo (`freetour`, `propios`, …). */
  proveedor: string;
  /** Categoría del proveedor (FREETOUR: categoryId) o `kind` del viaje propio. */
  categoriaId: string | number | null;
  /** Fuentes de tema secundarias del proveedor (viajes propios: `Trip.category`). */
  fuentesTema?: string[];
  /** Precio por persona en la moneda del proveedor; null = sin dato. */
  precio: number | null;
  durationMinutes?: number | null;
  durationDays?: number | null;
  /** Títulos en los idiomas que haya (es | en), tal cual los da el proveedor. */
  titulo: string;
  resumen?: string;
  /** REQ-1253: nombres de la ciudad base (es, en…), para saber si un «Viaje de 1 día» se queda en la ciudad. */
  ciudades?: readonly string[];
  /** Idiomas declarados por el evento o el viaje (ISO-639-1). */
  idiomas?: string[];
  /** Modos de las opciones del viaje propio. */
  modos?: ("group" | "private")[];
  vueloIncluido?: boolean;
  /** Solo reseñas reales (REQ-100). */
  calificacion?: number | null;
  resenas?: number | null;
  /** Casillas declaradas (atributos tras bandera). Nunca se infieren. */
  declarados?: Partial<Record<AtributoExtra, boolean>>;
}

export const ATRIBUTOS_EXTRA = [
  "franja-horaria", "grupo-pequeno", "familias", "solo-adultos", "parejas", "accesible", "sin-filas", "apto-lluvia",
  "cancelacion-gratis", "confirmacion-inmediata", "sostenible", "vip",
] as const;
export type AtributoExtra = (typeof ATRIBUTOS_EXTRA)[number];

export interface Decision<T> { valor: T; regla: string }

export interface ClassifyResult {
  formato: FormatoOEstado;
  reglaFormato: string;
  seccion: Seccion;
  temas: Tema[];
  reglasTemas: Decision<Tema>[];
  /** `privado`, `nocturno`, `medio:a-pie`, `idioma-es`, … */
  atributos: string[];
  reglasAtributos: Decision<string>[];
  /** Choques resueltos y datos raros; los registra el sync en T2. */
  avisos: string[];
}
