/**
 * REQ-10730 (código de la regla REQ-10698, PO 15-11-2026, literal: «Se clasifica y se asigna de acuerdo a la taxonomía
 * definida si no encaja en nada avisarme por correo y WhatsApp»; vale para todos los proveedores por REQ-10709).
 *
 * Un «tipo nuevo» es un par de códigos del proveedor (p. ej. `TypeCode|SubTypeCode` de Tangol) que la tabla de mapeo no
 * conoce y que por eso cae en la red de seguridad del proveedor (`CATEGORIA_TANGOL_SIN_TIPO`, 9000001). Aquí solo se
 * cuenta y se redacta el aviso; mandarlo es de `src/taxonomy/aviso-tipo-nuevo.ts`, tras `AVISO_TIPO_NUEVO_ENABLED`.
 * Puro: sin red, base ni reloj (la fecha llega por parámetro). Nunca propone una categoría: eso lo decide el PO.
 */
export interface TourTipado {
  proveedor: string;
  /** El par de códigos tal cual lo manda el proveedor (`TYPE|SUB`). */
  clave: string;
  externalId: string;
  titulo: string;
  /** true cuando el mapeo no reconoció el par y el tour cayó en la red de seguridad. */
  sinMapear: boolean;
}

export interface TipoNuevo { proveedor: string; clave: string; tours: number; ejemplos: string[] }

export interface AvisoTipoNuevo { asunto: string; texto: string; whatsapp: string }

const EJEMPLOS = 3;
const WHATSAPP_MAX = 3800; // WhatsApp admite 4096; se deja margen (igual que el resumen de proveedores, REQ-1568)

const NOMBRES: Record<string, string> = { tangol: "Tangol", freetour: "FREETOUR", extime: "Extime Travel", bigbus: "Big Bus Tours" };
const nombre = (p: string) => NOMBRES[p] ?? p;

/** Clave única del aviso: `proveedor:PAR`. Sirve para no avisar dos veces el mismo tipo. */
export const claveAviso = (proveedor: string, clave: string) => `${proveedor}:${clave}`;

// REQ-10730
export function tiposNuevos(tours: readonly TourTipado[], yaAvisados: Iterable<string> = []): TipoNuevo[] {
  const vistos = new Set(yaAvisados);
  const grupos = new Map<string, TipoNuevo>();
  for (const t of tours) {
    if (!t.sinMapear) continue;
    const k = claveAviso(t.proveedor, t.clave);
    if (vistos.has(k)) continue;
    const g = grupos.get(k) ?? { proveedor: t.proveedor, clave: t.clave, tours: 0, ejemplos: [] };
    g.tours += 1;
    if (g.ejemplos.length < EJEMPLOS && t.titulo) g.ejemplos.push(t.titulo);
    grupos.set(k, g);
  }
  return [...grupos.values()].sort((a, b) => b.tours - a.tours || a.clave.localeCompare(b.clave));
}

const fecha = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
};
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

const linea = (t: TipoNuevo) =>
  `${nombre(t.proveedor)} · ${t.clave} · ${t.tours} ${plural(t.tours, "tour", "tours")}${t.ejemplos.length ? ` (p. ej. ${t.ejemplos.join("; ")})` : ""}`;

// REQ-10730
export function textoAvisoTipoNuevo(tipos: readonly TipoNuevo[], o: { hoy: string }): AvisoTipoNuevo {
  const n = tipos.length;
  const proveedores = lista([...new Set(tipos.map((t) => nombre(t.proveedor)))]);
  const cabeza = `${n} ${plural(n, "tipo nuevo", "tipos nuevos")} de ${proveedores} que no ${plural(n, "encaja", "encajan")} en la taxonomía`;
  const asunto = `Travel Puzzle · ${cabeza} (${fecha(o.hoy)})`;
  const cierre = [
    "Mientras no se decida, esos tours quedan en la red de seguridad del proveedor (sin categoría visible) y se siguen publicando como hoy.",
    "Qué hace falta: decir a qué categoría del diccionario va cada par, o si se abre una nueva (REQ-10698).",
  ];
  const texto = [`Hola Adri, hoy el sync encontró ${cabeza}:`, "", ...tipos.map((t) => `- ${linea(t)}`), "", ...cierre].join("\n");

  // WhatsApp: cabe en un mensaje; lo que no cabe se remite al correo.
  const encabezado = `Travel Puzzle: ${cabeza}.`;
  const pie = cierre[1];
  const lineas: string[] = [];
  let largo = encabezado.length + pie.length + 2;
  for (let i = 0; i < tipos.length; i++) {
    const l = `- ${linea(tipos[i])}`;
    const resto = tipos.length - i;
    const aviso = `… y ${resto} más en el correo.`;
    if (largo + l.length + 1 + aviso.length + 1 > WHATSAPP_MAX) { lineas.push(aviso); break; }
    lineas.push(l);
    largo += l.length + 1;
  }
  const whatsapp = [encabezado, ...lineas, pie].join("\n");
  return { asunto, texto, whatsapp };
}
