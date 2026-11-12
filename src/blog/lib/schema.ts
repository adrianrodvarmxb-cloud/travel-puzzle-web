/**
 * REQ-253, REQ-254: esquema Zod del artículo con la plantilla de 14 bloques (skill blog-metodo-referentes). Puro.
 *  1 H1 (title) · 2 firma (author, publishedAt, updatedAt; lectura calculada) · 3 «En breve» (40–80 palabras)
 *  4 entrada · 5 de 4 a 8 H2 con su respuesta · 6 minicaso · 7 citas (máx. 2) · 8 datos con fuente https y fecha
 *  9 «Cómo lo sabemos» · 10 visual (tabla) · 11 enlaces en el texto (registry.linkProblems) · 12 FAQ (máx. 4)
 *  13 CTA única · 14 schema (seo.blogPostingJsonLd).
 * Un artículo con `draft: true` acepta huecos `[PO: …]`; uno publicado no.
 * REQ-971, REQ-979: autor «editorial» (Organization) para el agente diario; `origen`, `mix` (80/20) y `tema` los
 * exige el validador del diario (lib/diario.ts); los artículos a mano no cambian.
 */
import { z } from "zod";
import { PILLAR_SLUGS } from "./pillars";
import { textsOf } from "@/site/lib/vocab";

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const txt = (max: number) => z.string().trim().min(1).max(max);
const https = z.string().regex(/^https:\/\/\S+$/);

/** REQ-1050: formatos de imagen del cuerpo (skill blog-metodo-referentes, §Imágenes con formato). */
export const IMAGE_BLOCKS = ["banner", "ancho", "columna", "dos", "collage", "galeria"] as const;
export const IMAGE_LICENSES = ["Unsplash License", "Pexels License", "Pixabay Content License", "Permiso del proveedor"] as const;
export const IMAGE_BANKS = ["unsplash", "pexels", "pixabay", "proveedor"] as const;

/**
 * REQ-1050: imagen con texto alternativo, crédito visible, licencia y origen (banco, id, página, autor).
 * `src` es la base de los archivos optimizados del sitio (/blog/img/{slug}/{nombre} → -800/-1600 .avif/.webp/.jpg)
 * o una URL https (solo artículos a mano). La licencia y el origen los exige el validador del diario.
 */
export const imageSchema = z.object({
  src: z.string().regex(/^(\/|https:\/\/)\S+$/),
  alt: txt(160),
  credit: txt(160),
  license: z.object({ name: z.enum(IMAGE_LICENSES), url: https }).optional(),
  origen: z.object({ banco: z.enum(IMAGE_BANKS), id: txt(120), pagina: https, autor: txt(120), descarga: https.optional() }).optional(),
});
export type BlogImage = z.output<typeof imageSchema>;

// REQ-3449 (gate B2, REQ-3338): versión en inglés del artículo; mismas secciones, datos e imágenes que la española.
export const postEnSchema = z.object({
  targetTerm: txt(120),
  title: txt(120),
  summary: txt(155),
  enBreve: txt(800),
  entrada: txt(800),
  sections: z.array(z.object({ h2: txt(120), answer: txt(400), body: z.array(txt(3000)).default([]), list: z.array(txt(400)).optional() })).min(4).max(8),
  datos: z.array(z.object({ text: txt(400) })).optional(),
  comoLoSabemos: txt(600),
  visual: z.object({ caption: txt(160), head: z.array(txt(80)).min(2), rows: z.array(z.array(z.string().max(200))).min(1) }).optional(),
  faq: z.array(z.object({ q: txt(200), a: txt(800) })).max(4).optional(),
  cta: z.object({ label: txt(60) }),
  cover: z.object({ alt: txt(160) }).optional(),
  imagenes: z.array(z.object({ pie: txt(200).optional(), alts: z.array(txt(160)).min(1).max(5) })).max(4).optional(),
});
export type PostEn = z.output<typeof postEnSchema>;

export const postSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  pillar: z.enum(PILLAR_SLUGS),
  targetTerm: txt(120),
  title: txt(120),
  summary: txt(155),
  draft: z.boolean(),
  publishedAt: z.string().regex(DATE),
  updatedAt: z.string().regex(DATE).optional(),
  author: z.enum(["claudia", "adrian", "editorial"]),
  // REQ-1410: categoría del artículo; decide quién firma (viajes → Claudia, marketing → Adrián).
  categoria: z.enum(["viajes", "marketing"]).optional(),
  origen: z.enum(["manual", "agente-diario"]).default("manual"),
  mix: z.enum(["pago", "free"]).optional(),
  tema: z.object({
    tipo: z.enum(["trending", "calendario"]),
    clusterId: z.string().regex(/^[A-Z0-9-]{2,20}$/).optional(),
    fuentes: z.array(z.object({ label: txt(160), url: z.string().regex(/^https:\/\/\S+$/), fecha: z.string().regex(DATE) })).default([]),
  }).optional(),
  cover: imageSchema.optional(),
  // REQ-1050: imágenes del cuerpo en los formatos de la skill (banner, ancho, columna, dos, collage, galería).
  imagenes: z.array(z.object({
    formato: z.enum(IMAGE_BLOCKS),
    despues: z.number().int().min(0).max(7),
    fotos: z.array(imageSchema).min(1).max(5),
    pie: txt(200).optional(),
  })).max(4).optional(),
  enBreve: txt(800),
  entrada: txt(800),
  sections: z.array(z.object({ h2: txt(120), answer: txt(400), body: z.array(txt(3000)).default([]), list: z.array(txt(400)).optional() })).min(4).max(8),
  minicaso: z.object({ text: txt(900), illustrative: z.boolean() }).optional(),
  citas: z.array(z.object({ text: txt(500), who: txt(120) })).max(2).optional(),
  datos: z.array(z.object({ text: txt(400), source: z.object({ label: txt(160), url: z.string().regex(/^https:\/\/\S+$/) }), checkedAt: z.string().regex(DATE) })).optional(),
  comoLoSabemos: txt(600),
  visual: z.object({
    kind: z.literal("tabla"), caption: txt(160), head: z.array(txt(80)).min(2), rows: z.array(z.array(z.string().max(200))).min(1),
    source: z.object({ label: txt(160), url: z.string().regex(/^https:\/\/\S+$/) }).optional(),
  }).optional(),
  faq: z.array(z.object({ q: txt(200), a: txt(800) })).max(4).optional(),
  cta: z.object({ kind: z.enum(["whatsapp", "comercial"]), label: txt(60) }),
  /** REQ-3449: versión en inglés (opcional en el registro; el validador del agente la exige en entradas nuevas). */
  en: postEnSchema.optional(),
});

export type PostInput = z.input<typeof postSchema>;
export type Post = z.output<typeof postSchema>;

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const PENDING = "[PO:";

export function parsePost(input: unknown): { ok: true; post: Post } | { ok: false; error: string } {
  const r = postSchema.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const p = r.data;
  if (!p.draft) {
    if (textsOf(p).some((t) => t.includes(PENDING))) return { ok: false, error: "un artículo publicado no puede tener huecos [PO: …]" };
    const w = wordCount(p.enBreve);
    if (w < 40 || w > 80) return { ok: false, error: `«En breve» debe tener de 40 a 80 palabras (tiene ${w})` };
  }
  return { ok: true, post: p };
}
