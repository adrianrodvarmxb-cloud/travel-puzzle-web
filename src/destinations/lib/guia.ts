/**
 * Guías propias de ciudad (PO, 7 nov 2026, 06:17, opción c). Puro.
 * Viven en el repo (src/destinations/content/guias.json), versionadas como el blog diario: no se escribe en D1.
 * Al cargar el árbol de /destinos, el texto plano de la guía se superpone al campo `guide` de la ciudad, así la regla de
 * indexación (cityMeetsRule, ≥ 300 palabras) y quien la lea ven la guía sin cambios en la base.
 * Plantilla (skill blog-metodo-referentes adaptada a ciudad): respuesta primero («En breve»), 3 a 6 H2 en forma de
 * pregunta con su respuesta, fuentes enlazadas, cero datos inventados y cero texto de FREETOUR.
 */
import { z } from "zod";
import { inlineLinks, plainText } from "@/blog/lib/inline";
import { copiedFragments, PROHIBIDAS_DIARIO, unitsFactProblems } from "@/blog/lib/diario";
import { termConflicts } from "@/blog/lib/terms";
import { PROHIBIDAS_SITIO, textsOf } from "@/site/lib/vocab";
import { wordCount } from "./indexing";

export const GUIDE_MIN_WORDS_REPO = 300;
// REQ-1236 (reemplaza la parte «2 por día» de REQ-1227): PO, 7 nov 2026, 07:50, opción B.
export const GUIDES_PER_DAY = 5;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const txt = (max: number) => z.string().trim().min(1).max(max);

// REQ-1220: esquema de la guía
export const guideSchema = z.object({
  pais: z.string().regex(/^[a-z]{2}$/),
  ciudad: z.string().regex(SLUG),
  nombre: txt(80),
  targetTerm: txt(120),
  titulo: txt(120),
  publishedAt: z.string().regex(DATE),
  author: z.literal("editorial"),
  origen: z.literal("agente-diario"),
  enBreve: txt(800),
  sections: z.array(z.object({ h2: txt(120), answer: txt(600), body: z.array(txt(2000)).default([]), list: z.array(txt(400)).optional() })).min(3).max(6),
  comoLoSabemos: txt(600),
});
export type CityGuide = z.output<typeof guideSchema>;
export type CityGuideInput = z.input<typeof guideSchema>;

export function parseGuide(input: unknown): { ok: true; guide: CityGuide } | { ok: false; error: string } {
  const r = guideSchema.safeParse(input);
  return r.success ? { ok: true, guide: r.data } : { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

export const guideKey = (g: Pick<CityGuide, "pais" | "ciudad">) => `${g.pais}/${g.ciudad}`;
export const guideCityPath = (g: Pick<CityGuide, "pais" | "ciudad">) => `/destinos/${g.pais}/${g.ciudad}`;

const units = (g: CityGuide): [string, string][] => [
  ["enBreve", g.enBreve],
  ...g.sections.flatMap((s, i) => [
    [`sections[${i}].answer`, s.answer] as [string, string],
    ...s.body.map((b, j) => [`sections[${i}].body[${j}]`, b] as [string, string]),
    ...(s.list ?? []).map((l, j) => [`sections[${i}].list[${j}]`, l] as [string, string]),
  ]),
];

/** REQ-1222: texto plano de la guía (lo que se superpone a `City.guide` y cuenta para la regla de 300 palabras). */
export function guidePlain(g: CityGuide): string {
  return [plainText(g.enBreve), ...g.sections.flatMap((s) => [s.h2, plainText(s.answer), ...s.body.map(plainText), ...(s.list ?? []).map(plainText)])].join("\n\n");
}

export interface GuideCtx {
  today: string;
  /** Guías ya publicadas en el repo. */
  existing: CityGuide[];
  /** Rutas que responden (sitemaps de producción + fijas). */
  knownPaths: Set<string>;
  /** Términos de los artículos del blog, sus pilares y el calendario. */
  otherTerms: { term: string; label: string }[];
  /** Texto visible de la página de la ciudad (C2). */
  cityText?: string;
}

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const cleanPath = (href: string) => href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
const FIXED = ["/", "/tours", "/traslados", "/destinos", "/la-primera-pieza", "/viajes", "/blog"];

// REQ-1222…1227: validador de la guía
export function guideProblems(input: unknown, ctx: GuideCtx): { ok: true; guide: CityGuide } | { ok: false; problems: string[] } {
  const parsed = parseGuide(input);
  if (!parsed.ok) return { ok: false, problems: [parsed.error] };
  const g = parsed.guide;
  const out: string[] = [];
  // REQ-1227 + REQ-1236
  if (g.publishedAt !== ctx.today) out.push(`publishedAt debe ser la fecha de hoy (${ctx.today})`);
  const sameDay = ctx.existing.filter((x) => x.publishedAt === g.publishedAt && guideKey(x) !== guideKey(g)).length;
  if (sameDay >= GUIDES_PER_DAY) out.push(`ya hay ${GUIDES_PER_DAY} guías publicadas el ${g.publishedAt}`);
  // REQ-1222
  const words = wordCount(guidePlain(g));
  if (words < GUIDE_MIN_WORDS_REPO) out.push(`la guía necesita ${GUIDE_MIN_WORDS_REPO} palabras o más (tiene ${words})`);
  const enBreve = wordCount(plainText(g.enBreve));
  if (enBreve < 40 || enBreve > 80) out.push(`«En breve» debe tener de 40 a 80 palabras (tiene ${enBreve})`);
  if (!/(?<!\p{L})IA(?!\p{L})/u.test(g.comoLoSabemos) || /entrevist|aprobad[oa]s? por|revisad[oa]s? por/i.test(g.comoLoSabemos)) out.push("«Cómo lo sabemos» debe decir que se usó IA y no afirmar entrevistas ni aprobaciones");
  // REQ-1223
  out.push(...unitsFactProblems(units(g)));
  const links = units(g).flatMap(([, t]) => inlineLinks(t));
  const hosts = new Set(links.filter((l) => l.href.startsWith("https://")).map((l) => host(l.href)).filter(Boolean));
  if (hosts.size < 2) out.push(`la guía necesita 2 fuentes externas de dominios distintos (tiene ${hosts.size})`);
  // REQ-1224
  for (const t of textsOf(g)) {
    const m = PROHIBIDAS_SITIO.exec(t);
    if (m) out.push(`vocabulario prohibido: «${m[0]}»`);
    const d = PROHIBIDAS_DIARIO.exec(t);
    if (d) out.push(`vocabulario del blog diario: «${d[0]}»`);
  }
  if (ctx.cityText) {
    const frag = copiedFragments(guidePlain(g), ctx.cityText);
    if (frag.length) out.push(`C2: texto copiado de la página de la ciudad: «${frag[0]}»`);
  }
  // REQ-1225
  if (!ctx.knownPaths.has(guideCityPath(g))) out.push(`la ciudad ${guideCityPath(g)} no tiene página publicada`);
  if (ctx.existing.some((x) => guideKey(x) === guideKey(g))) out.push(`la ciudad ${guideKey(g)} ya tiene guía`);
  for (const l of links) {
    if (!l.href.startsWith("/")) continue;
    const p = cleanPath(l.href);
    if (!FIXED.includes(p) && !ctx.knownPaths.has(p)) out.push(`enlace que no resuelve: ${p}`);
  }
  // REQ-1226
  const conflicts = termConflicts(g.targetTerm, [...ctx.otherTerms, ...ctx.existing.filter((x) => guideKey(x) !== guideKey(g)).map((x) => ({ term: x.targetTerm, label: `guía ${guideKey(x)}` }))]);
  if (conflicts.length) out.push(`término repetido o casi igual: ${conflicts.join(", ")}`);
  const unique = [...new Set(out)];
  return unique.length ? { ok: false, problems: unique } : { ok: true, guide: g };
}

interface CountryLite { id: number; iso2: string | null }
interface CityLite { id: number; countryId: number; slug: string | null; guide: string | null; guideUpdatedAt: string | null }

// REQ-1228: la guía del repo gana sobre la de D1 (si la hubiera) para esa ciudad; las demás quedan igual.
export function overlayGuides<T extends CityLite>(countries: CountryLite[], cities: T[], guides: CityGuide[]): T[] {
  if (!guides.length) return cities;
  const iso = new Map(countries.map((c) => [c.id, (c.iso2 ?? "").toLowerCase()]));
  const byKey = new Map(guides.map((g) => [guideKey(g), g]));
  return cities.map((c) => {
    const g = c.slug ? byKey.get(`${iso.get(c.countryId) ?? ""}/${c.slug}`) : undefined;
    return g ? { ...c, guide: guidePlain(g), guideUpdatedAt: new Date(`${g.publishedAt}T00:00:00Z`).toISOString() } : c;
  });
}

// REQ-1229: siguientes ciudades — primero el orden de las 37 con viaje propio, luego por número de experiencias.
export function nextGuideCities(o: { order: string[]; byExperiences: string[]; existing: CityGuide[]; n?: number }): string[] {
  const done = new Set(o.existing.map(guideKey));
  return [...new Set([...o.order, ...o.byExperiences])].filter((k) => !done.has(k)).slice(0, o.n ?? GUIDES_PER_DAY);
}

// REQ-1231 + REQ-1236: páginas de ciudad de las guías más recientes, hasta las de un día (para la prueba de humo).
export function guideSmokePaths(guides: CityGuide[]): string[] {
  return [...guides].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).slice(0, GUIDES_PER_DAY).map(guideCityPath);
}
