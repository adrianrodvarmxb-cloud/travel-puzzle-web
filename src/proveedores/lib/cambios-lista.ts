// Puro · REQ-10887 (plan REQ-10886 §3 y §6; frente REQ-10885, PO 26-11-2026: «si hay un precio que se actualiza, alguna
// descripción que cambia, lo que sea, que se actualice con este archivo de proveedores»; alcance: «nada más para los
// proveedores que no tienen API»). Lee la lista diaria `cambios-para-la-pagina.json` (contrato del plan), aplica el
// filtro de alcance y valida cada cambio (REQ-10678: doble lectura que coincide, dato completo).
// - El código LEE el alcance de la lista: un proveedor «fuera» (API o sync propio) se ignora y se registra, nunca se
//   aplica; mover un proveedor de grupo es decisión del PO (se cambia en la tarea diaria, no aquí).
// - Nada de aquí escribe ni envía: sin D1, sin fetch, sin correo. Los netos no salen en motivos ni en el registro de
//   ignorados (nunca al cliente, REQ-10717); el I/O del PR 2 decide qué hace con cada cambio.
import { z } from "zod";

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const fecha = z.string().regex(ISO_DIA, "fecha en ISO (AAAA-MM-DD)");
const texto = z.string().trim().min(1);

const fuente = z.object({
  mensajeId: texto,
  fecha,
  adjunto: z.string().trim().min(1).optional(),
  pagina: z.number().int().positive().optional(),
});

const base = { id: texto, proveedor: texto, producto: texto, fuente };

/** Un cambio por producto y tipo. El neto es el del proveedor (privado): aquí solo se valida, nunca se muestra. */
const cambioSchema = z.discriminatedUnion("tipo", [
  z.object({
    ...base,
    tipo: z.literal("precio"),
    neto: z.object({
      monto: z.number().positive(),
      moneda: z.enum(["USD", "EUR", "MXN"]),
      /** REQ-10678: doble lectura; sin ella o distinta, el cambio no se aplica solo. */
      montoVerificado: z.number().positive().optional(),
    }),
    desde: fecha,
  }),
  z.object({ ...base, tipo: z.literal("descripcion"), texto }),
  z.object({ ...base, tipo: z.literal("programa"), texto }),
  z.object({ ...base, tipo: z.literal("condiciones"), texto }),
  z.object({
    ...base,
    tipo: z.literal("vigencia"),
    temporada: z.object({ desde: fecha, hasta: fecha }).refine((t) => t.desde <= t.hasta, { message: "la temporada lleva sus dos fechas en orden" }),
    texto: z.string().trim().optional(),
  }),
]);

const listaSchema = z.object({
  version: z.literal(1),
  generadoEn: fecha,
  origen: texto,
  alcance: z.object({ fuera: z.array(z.string()), dentro: z.array(z.string()) }, { message: "falta la sección alcance (fuera / dentro)" }),
  cambios: z.array(cambioSchema),
}).superRefine((l, ctx) => {
  const vistos = new Set<string>();
  for (const c of l.cambios) {
    if (vistos.has(c.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `id de cambio repetido: ${c.id}`, path: ["cambios"] });
    vistos.add(c.id);
  }
});

export type ListaCambios = z.infer<typeof listaSchema>;
export type Cambio = ListaCambios["cambios"][number];
export type CambioPrecio = Extract<Cambio, { tipo: "precio" }>;
export type TipoCambio = Cambio["tipo"];

export type LecturaLista = { ok: true; lista: ListaCambios } | { ok: false; motivos: string[] };

/** Lee la lista (objeto o texto JSON). Un contrato roto devuelve los motivos, uno por problema; nunca adivina. */
// REQ-10887
export function leerLista(raw: unknown): LecturaLista {
  let datos: unknown = raw;
  if (typeof raw === "string") {
    try { datos = JSON.parse(raw); } catch { return { ok: false, motivos: ["la lista no es JSON"] }; }
  }
  if (!datos || typeof datos !== "object") return { ok: false, motivos: ["la lista no es un objeto"] };
  const r = listaSchema.safeParse(datos);
  if (r.success) return { ok: true, lista: r.data };
  const motivos = r.error.issues.map((i) => {
    const ruta = i.path.join(".");
    if (i.code === "invalid_union" || ruta.endsWith(".tipo")) return `${ruta}: tipo de cambio desconocido (precio, descripcion, programa, vigencia, condiciones)`;
    return `${ruta || "lista"}: ${i.message}`;
  });
  return { ok: false, motivos: [...new Set(motivos)] };
}

/** Id de proveedor normalizado: minúsculas, sin acentos ni espacios alrededor; «Exotic-Escapes » = «exotic-escapes». */
const idNorm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface Ignorado { id: string; proveedor: string; motivo: string }
export interface Alcance { dentro: Cambio[]; ignorados: Ignorado[] }

export const MOTIVO_FUERA = "fuera del alcance: el proveedor tiene API o su propio sync (lo decide el PO en la lista)";
export const MOTIVO_SIN_GRUPO = "el proveedor no está en ningún grupo del alcance (lo decide el PO en la lista)";
export const MOTIVO_DOS_GRUPOS = "el proveedor está en los dos grupos del alcance: cuenta como fuera hasta que el PO lo aclare";

/**
 * Filtro de alcance: solo entran los cambios de proveedores «dentro». Un proveedor «fuera», uno que no está en ningún
 * grupo o uno que está en los dos se ignora y se registra con su motivo. El orden de la lista se respeta.
 */
// REQ-10887
export function filtrarAlcance(lista: ListaCambios): Alcance {
  const fuera = new Set(lista.alcance.fuera.map(idNorm));
  const dentro = new Set(lista.alcance.dentro.map(idNorm));
  const out: Alcance = { dentro: [], ignorados: [] };
  for (const c of lista.cambios) {
    const p = idNorm(c.proveedor);
    const enFuera = fuera.has(p);
    const enDentro = dentro.has(p);
    if (enFuera && enDentro) out.ignorados.push({ id: c.id, proveedor: c.proveedor, motivo: MOTIVO_DOS_GRUPOS });
    else if (enFuera) out.ignorados.push({ id: c.id, proveedor: c.proveedor, motivo: MOTIVO_FUERA });
    else if (enDentro) out.dentro.push(c);
    else out.ignorados.push({ id: c.id, proveedor: c.proveedor, motivo: MOTIVO_SIN_GRUPO });
  }
  return out;
}

export interface Validacion { aplicableSolo: boolean; motivos: string[] }

/**
 * ¿Mila puede aplicarlo sola (sujeto al tope del 20 %, PR 2)? Solo un precio con doble lectura que coincide, moneda,
 * fecha y producto (el contrato ya exige esos campos). Lo que no es precio es propuesta para el PO (REQ-10670).
 * Los motivos no llevan montos.
 */
// REQ-10887
export function validarCambio(c: Cambio): Validacion {
  if (c.tipo !== "precio") return { aplicableSolo: false, motivos: ["no es precio: queda como propuesta para el PO"] };
  const motivos: string[] = [];
  if (c.neto.montoVerificado === undefined) motivos.push("sin doble lectura del neto");
  else if (Math.abs(c.neto.montoVerificado - c.neto.monto) > 0.005) motivos.push("la doble lectura del neto no coincide");
  return { aplicableSolo: motivos.length === 0, motivos };
}
