/**
 * REQ-401, REQ-404: esquemas Zod del diccionario y de los mapeos por proveedor. Un término o un mapeo
 * inválido rompe la suite y el build (los JSON se parsean al importarse en `src/taxonomy/data/index.ts`).
 */
import { z } from "zod";
import { ESTADOS_TERMINO, FORMATOS, ESTADOS_FORMATO, MEDIOS, SECCIONES, TEMAS } from "../lib/types";

const FORMATO_O_ESTADO = [...FORMATOS, ...ESTADOS_FORMATO] as const;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slug = z.string().regex(SLUG);
const texto = z.string().trim();

/** Una palabra clave es un fragmento de regex sobre texto normalizado (minúsculas, sin acentos); `*` al final = prefijo. */
const palabra = z.string().min(1).refine((w) => {
  try { new RegExp(w.endsWith("*") ? w.slice(0, -1) : w); return true; } catch { return false; }
}, "palabra clave inválida");

const base = z.object({
  slug,
  termino_es: texto.min(1),
  termino_en: texto.min(1),
  definicion_es: z.string(),
  definicion_en: z.string().optional(),
  sinonimos: z.array(texto.min(1)),
  estado: z.enum(ESTADOS_TERMINO),
  nota: z.string().optional(),
  extra: z.boolean().optional(),
});

const zFormato = base.extend({
  eje: z.literal("formato"),
  slug: z.enum(FORMATO_O_ESTADO),
  precedencia: z.number().int().min(0).max(12).nullable(),
  seccion: z.enum(SECCIONES),
  guiaEnPersona: z.boolean(),
  palabras: z.array(palabra).optional(),
  palabrasNoEnTitulo: z.array(palabra).optional(),
  coleccion_es: z.string().optional(),
  termino_en_estado: z.enum(["por_firmar", "firmado"]).optional(),
  /** Nombre visible en pt/de/fr/it (plan §7.3). */
  nombres: z.object({ pt: texto.min(1), de: texto.min(1), fr: texto.min(1), it: texto.min(1) }).optional(),
  apoyo_es: z.string().optional(),
  apoyo_estado: z.enum(["por_firmar", "firmado"]).optional(),
});
const zTema = base.extend({
  eje: z.literal("tema"),
  slug: z.enum(TEMAS),
  prioridad: z.number().int().min(1),
  chip: z.boolean(),
  palabras: z.array(palabra).min(1),
  excluir: z.array(palabra).optional(),
});
const zValor = z.object({ slug, termino_es: texto.min(1), termino_en: texto.min(1), palabras: z.array(palabra).optional(), min: z.number().int().optional(), max: z.number().int().nullable().optional() });
const zAtributo = base.extend({ eje: z.literal("atributo"), palabras: z.array(palabra).optional(), valores: z.array(zValor).optional() });
const zFaceta = base.extend({ eje: z.literal("faceta") });
const zNivel = z.object({ nivel: z.number().int().min(1).max(5), termino_es: texto.min(1), termino_en: texto.min(1), definicion_es: texto.min(1) });
const zFacetaCircuito = base.extend({ eje: z.literal("faceta-circuito"), valores: z.array(zValor).optional(), niveles: z.array(zNivel).optional() });
const zEntorno = base.extend({ eje: z.literal("entorno"), sinonimo_de: z.array(z.enum(TEMAS)).optional() });

export const zTermino = z.discriminatedUnion("eje", [zFormato, zTema, zAtributo, zFaceta, zFacetaCircuito, zEntorno]);
export type Termino = z.infer<typeof zTermino>;
export type TerminoFormato = z.infer<typeof zFormato>;
export type TerminoTema = z.infer<typeof zTema>;
export type TerminoAtributo = z.infer<typeof zAtributo>;
export type TerminoFacetaCircuito = z.infer<typeof zFacetaCircuito>;

const zLegado = z.object({
  termino: texto.min(1),
  fuente: z.enum(["taxonomia-2024", "categorias-2023"]),
  sinonimo_de: z.array(z.enum(TEMAS)),
  estado: z.enum(ESTADOS_TERMINO).optional(),
  nota: z.string().optional(),
}).refine((l) => l.fuente !== "taxonomia-2024" || l.sinonimo_de.length > 0, "un término de 2024 debe ser sinónimo de al menos un tema");

export const zDictionary = z.object({
  version: z.string().min(1),
  fuente: z.string(),
  raiz: z.object({ slug, termino_es: texto.min(1), termino_en: texto.min(1), nota: z.string().optional() }),
  terminos: z.array(zTermino),
  legado: z.array(zLegado),
}).superRefine((d, ctx) => {
  const vistos = new Set<string>();
  for (const t of d.terminos) {
    const k = `${t.eje}:${t.slug}`;
    if (vistos.has(k)) ctx.addIssue({ code: "custom", message: `slug repetido ${k}` });
    vistos.add(k);
  }
  for (const f of [...FORMATO_O_ESTADO]) if (!vistos.has(`formato:${f}`)) ctx.addIssue({ code: "custom", message: `falta el formato ${f}` });
  for (const f of TEMAS) if (!vistos.has(`tema:${f}`)) ctx.addIssue({ code: "custom", message: `falta el tema ${f}` });
  const prec = d.terminos.flatMap((t) => (t.eje === "formato" && t.precedencia !== null ? [t.precedencia] : []));
  if (new Set(prec).size !== prec.length) ctx.addIssue({ code: "custom", message: "dos formatos con la misma precedencia" });
});
export type Dictionary = z.infer<typeof zDictionary>;

const zCategoria = z.object({
  id: z.string().min(1),
  nombre_es: z.string(),
  nombre_en: z.string(),
  /** Formato base: el que gana si ninguna regla de menor precedencia se cumple antes. */
  formato: z.enum(FORMATO_O_ESTADO),
  temas: z.array(z.enum(TEMAS)).max(3),
  atributos: z.array(z.string().regex(/^(nocturno|medio:(bici|barco|vehiculo|a-pie))$/)),
  /** Reglas por palabra que esta categoría permite (FREETOUR 13/14: traslado y entradas; 5: clase o taller). */
  reglasPorPalabra: z.array(z.enum(["traslado", "entradas", "experiencia-unica"])),
  estado: z.enum(["activo", "tras_bandera", "oculto", "historico"]),
  /** El formato base gana de inmediato (viajes propios con kind explícito). */
  fijo: z.boolean().optional(),
  nota: z.string().optional(),
});
export type Categoria = z.infer<typeof zCategoria>;

export const zMapping = z.object({
  proveedor: slug,
  version: z.string().min(1),
  revisado: z.string().min(1),
  /** Solo FREETOUR: precio 0 = free tour a propina (Pieza libre). */
  precioCeroEsPiezaLibre: z.boolean(),
  /** FREETOUR: false (el proveedor puede rechazar por aforo; cumplimiento D1/A3). */
  permiteConfirmacionInmediata: z.boolean(),
  categorias: z.array(zCategoria).min(1),
  temasPorFuente: z.record(z.string(), z.array(z.enum(TEMAS))).optional(),
}).superRefine((m, ctx) => {
  const ids = m.categorias.map((c) => c.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: `${m.proveedor}: categoría repetida` });
});
export type Mapping = z.infer<typeof zMapping>;

export const MEDIO_SLUGS = MEDIOS;

export function parseDictionary(data: unknown): Dictionary { return zDictionary.parse(data); }
export function parseMapping(data: unknown): Mapping { return zMapping.parse(data); }
