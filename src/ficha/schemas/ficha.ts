/**
 * REQ-10776: validación con Zod del modelo de la ficha antes de llegar al cliente (blindaje, regla 8: un registro
 * malo se descarta y se registra, no tumba la página). Pura.
 */
import { z } from "zod";
import type { FichaModel } from "../lib/model";

const term = z.object({ slug: z.string().min(1), label: z.string().min(1) });
const price = z.object({ amount: z.number().finite().nonnegative(), currency: z.string().length(3), per: z.enum(["person", "group", "total"]) });
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const fichaSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  externalRef: z.string().min(1),
  code: z.string().nullable(),
  slug: z.string().nullable(),
  lang: z.enum(["es", "en", "pt", "fr", "de", "it"]),
  section: z.enum(["experiencias", "traslados"]),
  country: z.object({ code: z.string().min(2).max(3), name: z.string().min(1) }),
  city: z.object({ slug: z.string().min(1), name: z.string().min(1) }),
  gallery: z.array(z.object({ url: z.string().url(), alt: z.string().nullable() })),
  title: z.string().min(1),
  rating: z.object({ value: z.number().min(0).max(5).nullable(), count: z.number().int().nonnegative(), favorite: z.boolean() }).nullable(),
  taxonomy: z.object({ tipo: term.nullable(), temas: z.array(term), atributos: z.array(term) }),
  facts: z.object({
    durationMinutes: z.number().int().positive().nullable(),
    schedule: z.string().nullable(),
    languages: z.array(z.string().min(2).max(5)),
    season: z.string().nullable(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
    ages: z.object({ childFrom: z.number().int().nonnegative(), childTo: z.number().int().nonnegative() }).nullable(),
  }),
  brief: z.string().nullable(),
  highlights: z.array(z.string().min(1)),
  descriptionHtml: z.string().nullable(),
  itinerary: z.array(z.object({ day: z.number().int().positive(), title: z.string().nullable(), text: z.string().min(1) })),
  includes: z.array(z.string().min(1)),
  excludes: z.array(z.string().min(1)),
  meeting: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("exact"), lat, lng, title: z.string().nullable() }),
    z.object({ kind: z.literal("zone"), lat, lng, radiusM: z.number().positive(), title: z.string().nullable() }),
    z.object({ kind: z.literal("none"), title: z.string().nullable() }),
  ]),
  price: price.nullable(),
  options: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), price: price.nullable(), transferIncluded: z.boolean().nullable(), startTime: z.string().nullable() })),
  whatToBring: z.array(z.string().min(1)),
  requirements: z.array(z.string().min(1)),
  cancellation: z.object({ hours: z.number().positive().nullable(), text: z.string().nullable() }).nullable(),
  notes: z.array(z.string().min(1)),
  operator: z.string().nullable(),
  booking: z.object({ mode: z.enum(["calendar", "purchase", "request", "advisor"]), chargedBy: z.enum(["travelpuzzle", "provider", "none"]), leadHours: z.number().nonnegative().nullable() }),
}) satisfies z.ZodType<FichaModel>;

/** Campos que nunca pueden viajar al navegador (REQ-10540; plan: «sin neto ni comisión»). */
const PRIVATE_KEYS = /^(net|neto|commission|comision|markup|providerPhone|providerEmail|email|phone)$/i;

export type FichaCheck = { ok: true; ficha: FichaModel } | { ok: false; reason: string };

/** Valida y además rechaza cualquier llave privada colada en cualquier nivel (el esquema es `strict` en la raíz). */
// REQ-10776
export function checkFicha(input: unknown): FichaCheck {
  const leak = findPrivateKey(input, "");
  if (leak) return { ok: false, reason: `campo privado en el modelo: ${leak}` };
  const r = fichaSchema.strict().safeParse(input);
  if (!r.success) return { ok: false, reason: r.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "raíz"}: ${i.message}`).join("; ") };
  return { ok: true, ficha: r.data };
}

function findPrivateKey(v: unknown, path: string): string | null {
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const f = findPrivateKey(v[i], `${path}[${i}]`); if (f) return f; } return null; }
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (PRIVATE_KEYS.test(k)) return path ? `${path}.${k}` : k;
      const f = findPrivateKey(x, path ? `${path}.${k}` : k);
      if (f) return f;
    }
  }
  return null;
}
