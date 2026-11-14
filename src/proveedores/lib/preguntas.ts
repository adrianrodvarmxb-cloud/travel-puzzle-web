// Puro · REQ-10648: preguntas abiertas por proveedor (plan REQ-3457, G1-A, G2-A, G3-A, G4-A, PO 14 nov 2026).
// Mila pide solo lo que falta, en el idioma del proveedor, en un solo correo con dos secciones:
// arriba, hasta 5 puntos agrupados por tema (lo que desbloquea vender); abajo, «Para cerrar el alta» en 2 o 3 líneas.
// Sin red, sin base, sin reloj: el día de hoy entra por parámetro (INC-001). Nunca montos ni datos fiscales.

export type Idioma = "es" | "en";
/** Los temas que desbloquean vender van arriba; `alta` va abajo. */
export type Tema = "tarifas" | "calendario" | "pago" | "cancelacion" | "alta";

export interface Pregunta {
  id: string;
  tema: Tema;
  es: string;
  en: string;
  /** Folio del tablero que la originó, si lo hay. */
  req: string | null;
  /** Día en que se abrió (AAAA-MM-DD). */
  desde: string;
  /** Día en que se cerró, o null si sigue abierta. Cerrar no borra: queda el historial (G3). */
  cerrada: string | null;
}

export interface Recordatorio {
  /** Hasta 5 puntos, uno por tema, en el orden tarifas → calendario → pago → cancelación. */
  arriba: string[];
  /** «Para cerrar el alta»: preguntas de alta propias y la lista genérica, en 2 o 3 líneas. */
  cierre: string[];
}

const ORDEN_VENTA: Tema[] = ["tarifas", "calendario", "pago", "cancelacion"];
const MAX_ARRIBA = 5;
const MAX_CIERRE = 3;

const ETIQUETA: Record<Idioma, Record<Tema, string>> = {
  es: { tarifas: "Tarifas", calendario: "Calendario", pago: "Pago", cancelacion: "Cancelación", alta: "Para cerrar el alta" },
  en: { tarifas: "Rates", calendario: "Calendar", pago: "Payment", cancelacion: "Cancellation", alta: "To complete onboarding" },
};

const texto = (p: Pregunta, idioma: Idioma) => (idioma === "en" ? p.en : p.es).trim();

// REQ-10648: solo las que siguen sin cerrar, en el orden en que se abrieron.
export function abiertas(preguntas: readonly Pregunta[]): Pregunta[] {
  return preguntas.filter((p) => !p.cerrada).slice().sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0));
}

// REQ-10648 (G3-A): cerrar marca la fecha; no borra ni reordena. Un id desconocido no cambia nada.
export function cerrar(preguntas: readonly Pregunta[], id: string, hoyIso: string): Pregunta[] {
  return preguntas.map((p) => (p.id === id && !p.cerrada ? { ...p, cerrada: hoyIso } : p));
}

/** Une las preguntas de un tema en un solo punto: «Tarifas: a; b; c.» */
function puntoDeTema(tema: Tema, lista: Pregunta[], idioma: Idioma): string {
  const partes = lista.map((p) => texto(p, idioma)).filter(Boolean);
  const cuerpo = partes.map((t) => t.replace(/\.$/, "")).join("; ");
  return `${ETIQUETA[idioma][tema]}: ${cuerpo}.`;
}

/**
 * REQ-10648: el texto del recordatorio. Arriba, un punto por tema de venta con todas sus preguntas (máximo 5 puntos);
 * abajo, las preguntas de alta propias y la lista genérica (`alta`, ya en el idioma del proveedor), en 2 o 3 líneas.
 * Sin preguntas propias, el cierre sale igual que hoy: solo la lista de alta (caracterización, LSP).
 */
export function textoRecordatorio(d: { preguntas: readonly Pregunta[]; idioma: Idioma; alta: readonly string[] }): Recordatorio {
  const vivas = abiertas(d.preguntas);
  const arriba: string[] = [];
  for (const tema of ORDEN_VENTA) {
    const del = vivas.filter((p) => p.tema === tema);
    if (del.length && arriba.length < MAX_ARRIBA) arriba.push(puntoDeTema(tema, del, d.idioma));
  }
  const propiasAlta = vivas.filter((p) => p.tema === "alta").map((p) => texto(p, d.idioma)).filter(Boolean);
  const cierre = [...propiasAlta, ...d.alta.map((t) => t.trim()).filter(Boolean)].slice(0, MAX_CIERRE);
  return { arriba, cierre };
}

export interface CandidatoCorreo {
  proveedorId: string;
  /** Correo del contacto, tal cual; se compara sin mayúsculas ni espacios. */
  contacto: string;
  /** Último día en que se le escribió a esa persona (AAAA-MM-DD), o null. */
  ultimoCorreoAlContacto: string | null;
}

export interface CorreoPorContacto {
  contacto: string;
  /** Un apartado por proveedor, en el orden en que llegaron. */
  proveedores: string[];
}

const clave = (correo: string) => correo.trim().toLowerCase();

/**
 * REQ-10648 (G4-A): una misma persona que representa a varios proveedores recibe UN solo correo con un apartado
 * por proveedor, y no más de uno al día. Si ya se le escribió hoy, no sale nada para ella.
 */
export function espaciarPorContacto(candidatos: readonly CandidatoCorreo[], hoyIso: string): CorreoPorContacto[] {
  const porContacto = new Map<string, CorreoPorContacto & { hoy: boolean }>();
  for (const c of candidatos) {
    const k = clave(c.contacto);
    if (!k) continue;
    const actual = porContacto.get(k) ?? { contacto: c.contacto.trim(), proveedores: [], hoy: false };
    if (c.ultimoCorreoAlContacto === hoyIso) actual.hoy = true;
    if (!actual.proveedores.includes(c.proveedorId)) actual.proveedores.push(c.proveedorId);
    porContacto.set(k, actual);
  }
  return [...porContacto.values()].filter((c) => !c.hoy).map(({ contacto, proveedores }) => ({ contacto, proveedores }));
}

/** Lee la columna `preguntas` (JSON) con tolerancia: un registro malo se descarta, no tumba nada (ISO 25010). */
export function leerPreguntas(json: string | null | undefined): Pregunta[] {
  if (!json) return [];
  let crudo: unknown;
  try {
    crudo = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(crudo)) return [];
  const temas: Tema[] = ["tarifas", "calendario", "pago", "cancelacion", "alta"];
  return crudo.filter((x): x is Pregunta => {
    if (!x || typeof x !== "object") return false;
    const o = x as Record<string, unknown>;
    return typeof o.id === "string" && o.id.length > 0 && temas.includes(o.tema as Tema) && typeof o.es === "string" &&
      typeof o.en === "string" && typeof o.desde === "string" && (o.cerrada === null || typeof o.cerrada === "string") &&
      (o.req === null || typeof o.req === "string");
  });
}
