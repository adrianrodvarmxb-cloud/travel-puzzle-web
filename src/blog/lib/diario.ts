/**
 * Validador puro de la entrada del agente diario (gate «Publica solo cada día», docs/gates-blog-diario-2026-11-06.md).
 * Recibe todo por parámetro: fecha de hoy, artículos existentes, rutas que resuelven, calendario y texto de las fichas.
 * Una sola falla = NO PUBLICA; devuelve todas las fallas para que el issue diga el motivo completo.
 */
import { parsePost, wordCount, type Post } from "./schema";
import { inlineLinks, plainText } from "./inline";
import { linkProblems, postPath, pillarPath, duplicates } from "./registry";
import { PILLARS, pillarBySlug } from "./pillars";
import { termConflicts, normalizeTerm } from "./terms";
import { mixProblems, addDays, type MixPost } from "./mix";
import type { CalendarItem } from "../content/calendario";
import { PROHIBIDAS_SITIO, textsOf } from "@/site/lib/vocab";

export interface DiarioCtx {
  /** AAAA-MM-DD en CDMX (lo pone la raíz con I/O). */
  today: string;
  /** Todos los artículos del registro (a mano y del diario, borradores incluidos). */
  existing: Post[];
  /** Rutas del sitio que responden (sitemaps de producción + rutas fijas), sin query. */
  knownPaths: Set<string>;
  primeraPieza: boolean;
  b1FreeTours: boolean;
  calendar: CalendarItem[];
  /** Texto visible de las fichas enlazadas (ruta → texto), para la regla C2. */
  fichaTexts?: Record<string, string>;
}

export const TRENDING_MAX_DAYS = 14;
export const COPY_NGRAM = 12;
/** Rutas fijas que existen siempre (no salen en los sitemaps de destinos). */
export const FIXED_PATHS = ["/", "/tours", "/traslados", "/destinos", "/la-primera-pieza", "/viajes", "/ayuda", "/terminos", "/privacidad"];

/** REQ-967: lo que el blog diario nunca dice (además de PROHIBIDAS_SITIO): huecos, experiencia propia sin respaldo y promesas. */
export const PROHIBIDAS_DIARIO =
  /\[(PO|CLIENTE):|(?<!\p{L})(nuestros? (clientes|viajeros|guías?)|en nuestra experiencia|hemos (acompañado|llevado|atendido|visto)|testimonios?|ejemplo ilustrativo|caso real|operamos|pag(a|as|ar|ue) en l[ií]nea|paga ahora|reserva y paga)(?!\p{L})/iu;

/** REQ-966: afirmaciones de requisito o de regla que necesitan fuente aunque no traigan cifra. */
const FACT_RE = /(?<!\p{L})(requisitos?|obligatori[oa]s?|exige|exigen|visa|visado|pasaporte|entr[óa] en vigor|a partir del|vigente|prohib\p{L}*|multa|tarifa oficial)(?!\p{L})/iu;
const SOURCE_HREF = /^(https:\/\/|\/(destinos|viajes|tours|traslados|la-primera-pieza)(\/|\?|$))/;

/** Unidades de texto que se revisan con la regla de fuente (los encabezados y la meta no). */
function units(p: Post): [string, string][] {
  return [
    ["enBreve", p.enBreve],
    ["entrada", p.entrada],
    ...p.sections.flatMap((s, i) => [
      [`sections[${i}].answer`, s.answer] as [string, string],
      ...s.body.map((b, j) => [`sections[${i}].body[${j}]`, b] as [string, string]),
      ...(s.list ?? []).map((l, j) => [`sections[${i}].list[${j}]`, l] as [string, string]),
    ]),
    ...(p.faq ?? []).map((f, i) => [`faq[${i}].a`, f.a] as [string, string]),
  ];
}

// REQ-966
export function factProblems(p: Post): string[] {
  const out: string[] = [];
  for (const [where, text] of units(p)) {
    const plain = plainText(text);
    if (!/\d/.test(plain) && !FACT_RE.test(plain)) continue;
    if (inlineLinks(text).some((l) => SOURCE_HREF.test(l.href))) continue;
    out.push(`cifra o afirmación sin fuente enlazada en ${where}: «${plain.length > 90 ? `${plain.slice(0, 90)}…` : plain}»`);
  }
  if (p.visual && p.visual.rows.some((r) => r.some((c) => /\d/.test(c))) && !p.visual.source) out.push("la tabla trae cifras: falta visual.source con su fuente");
  return out;
}

const words = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9ñ]+/).filter(Boolean);

// REQ-963 (C2): fragmentos de `n` palabras seguidas de `text` que aparecen en `ref`. Lo que va entre «» no cuenta.
export function copiedFragments(text: string, ref: string, n = COPY_NGRAM): string[] {
  const own = words(text.replace(/«[^»]*»/g, " | "));
  const refW = words(ref);
  if (own.length < n || refW.length < n) return [];
  const grams = new Set<string>();
  for (let i = 0; i + n <= refW.length; i++) grams.add(refW.slice(i, i + n).join(" "));
  const out: string[] = [];
  for (let i = 0; i + n <= own.length; i++) {
    const g = own.slice(i, i + n).join(" ");
    if (grams.has(g)) { out.push(g); i += n - 1; }
  }
  return out;
}

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const cleanPath = (href: string) => (href.split(/[?#]/)[0].replace(/\/+$/, "") || "/");

export type DailyResult = { ok: true; post: Post } | { ok: false; problems: string[] };

export function validateDailyEntry(input: unknown, ctx: DiarioCtx): DailyResult {
  const parsed = parsePost(input);
  if (!parsed.ok) return { ok: false, problems: [parsed.error] };
  const p = parsed.post;
  const problems: string[] = [];

  // REQ-979: quién, qué y cuándo
  if (p.origen !== "agente-diario") problems.push("origen debe ser «agente-diario»");
  if (p.author !== "editorial") problems.push("el autor de una entrada del agente es «editorial» (Equipo editorial de Travel Puzzle)");
  if (p.draft) problems.push("una entrada del agente se publica (draft: false)");
  if (!p.mix) problems.push("falta mix (pago o free)");
  if (!p.tema) problems.push("falta tema (trending o calendario)");
  // REQ-969
  if (p.publishedAt !== ctx.today) problems.push(`publishedAt debe ser la fecha de hoy (${ctx.today})`);
  if (p.updatedAt) problems.push("una entrada nueva no lleva updatedAt");
  if (pillarBySlug(p.pillar)?.status !== "activo") problems.push(`el pilar ${p.pillar} no está activo`);

  // REQ-965: plantilla del agente (bloques 6 y 7 requieren material del cliente: se omiten)
  if (p.minicaso) problems.push("bloque 6 (minicaso) prohibido en una entrada del agente: requiere material del cliente");
  if (p.citas?.length) problems.push("bloque 7 (citas) prohibido en una entrada del agente: requiere material del cliente");
  if (!p.datos?.length) problems.push("falta el bloque 8: al menos un dato con fuente");
  if (!p.visual) problems.push("falta el bloque 10: tabla");
  if (!/(?<!\p{L})IA(?!\p{L})|inteligencia artificial/iu.test(p.comoLoSabemos) || /entrevist|aprobad[oa]s? por|revisad[oa]s? por/i.test(p.comoLoSabemos)) {
    problems.push("bloque 9 «Cómo lo sabemos» debe decir que se usó IA y no afirmar entrevistas ni aprobaciones");
  }
  for (const d of p.datos ?? []) if (d.checkedAt > ctx.today) problems.push(`dato con fecha de consulta futura: ${d.checkedAt}`);
  const enBreveWords = wordCount(p.enBreve);
  if (enBreveWords < 40 || enBreveWords > 80) problems.push(`«En breve» debe tener de 40 a 80 palabras (tiene ${enBreveWords})`);

  // REQ-966
  problems.push(...factProblems(p));

  // REQ-967 + REQ-963: vocabulario
  for (const t of textsOf(p)) {
    const m = PROHIBIDAS_SITIO.exec(t);
    if (m) problems.push(`vocabulario prohibido: «${m[0]}»`);
    const d = PROHIBIDAS_DIARIO.exec(t);
    if (d) problems.push(`vocabulario del blog diario: «${d[0]}»`);
  }

  // REQ-968: enlaces que resuelven (los hermanos solo si están publicados)
  const published = ctx.existing.filter((x) => !x.draft && x.slug !== p.slug);
  const blogPaths = new Set<string>([
    "/blog",
    ...PILLARS.filter((pl) => pl.status === "activo" && (pl.slug === p.pillar || published.some((x) => x.pillar === pl.slug))).map((pl) => pillarPath(pl.slug)),
    ...published.filter((x) => pillarBySlug(x.pillar)?.status === "activo").map(postPath),
  ]);
  const allTexts = [p.enBreve, p.entrada, p.comoLoSabemos, ...p.sections.flatMap((s) => [s.answer, ...s.body, ...(s.list ?? [])]), ...(p.faq ?? []).map((f) => f.a), ...(p.datos ?? []).map((d) => d.text)];
  const links = allTexts.flatMap(inlineLinks);
  for (const l of links) {
    if (!l.href.startsWith("/")) continue;
    const path = cleanPath(l.href);
    if (!FIXED_PATHS.includes(path) && !ctx.knownPaths.has(path) && !blogPaths.has(path)) problems.push(`enlace que no resuelve: ${path}`);
  }
  problems.push(...linkProblems(p, [p, ...published], { primeraPieza: ctx.primeraPieza }));

  // REQ-962 + REQ-983
  if (p.mix) {
    if (p.mix === "free" && !ctx.b1FreeTours) problems.push("free tour bloqueado: falta la autorización B1 del proveedor por escrito (registro de autorizaciones, pregunta 7)");
    const mixPosts: MixPost[] = ctx.existing.map((x) => ({ publishedAt: x.publishedAt, mix: x.mix, draft: x.draft }));
    problems.push(...mixProblems({ publishedAt: p.publishedAt, mix: p.mix }, mixPosts));
  }

  // REQ-970: término y slug únicos, sin canibalización
  const others = ctx.existing.filter((x) => x.slug !== p.slug || x.pillar !== p.pillar);
  for (const dup of duplicates([...ctx.existing, p])) if (!duplicates(ctx.existing).includes(dup)) problems.push(dup);
  const own = p.tema?.clusterId;
  const conflicts = termConflicts(p.targetTerm, [
    ...others.map((x) => ({ term: x.targetTerm, label: x.slug })),
    ...PILLARS.map((pl) => ({ term: pl.term, label: `pilar ${pl.slug}` })),
    ...ctx.calendar.filter((c) => c.id !== own).map((c) => ({ term: c.term, label: c.id })),
  ]);
  if (conflicts.length) problems.push(`término repetido o casi igual: ${conflicts.join(", ")}`);

  // REQ-964: tema del día
  if (p.tema?.tipo === "trending") {
    const from = addDays(ctx.today, -TRENDING_MAX_DAYS);
    const recent = p.tema.fuentes.filter((f) => f.fecha >= from && f.fecha <= ctx.today);
    const hosts = new Set(recent.map((f) => host(f.url)).filter(Boolean));
    if (hosts.size < 2) problems.push(`tema trending: necesita 2 o más fuentes de dominios distintos publicadas en los ${TRENDING_MAX_DAYS} días previos (tiene ${hosts.size})`);
  }
  if (p.tema?.tipo === "calendario" || (p.tema?.tipo === "trending" && own)) {
    const item = ctx.calendar.find((c) => c.id === own);
    if (!item) problems.push(`tema calendario: el ID ${own ?? "(vacío)"} no está en el calendario`);
    else {
      const user = ctx.existing.find((x) => x.tema?.clusterId === item.id && x.slug !== p.slug);
      if (user) problems.push(`tema calendario: el ID ${item.id} ya se usó (${user.slug})`);
      if (p.tema.tipo === "calendario" && normalizeTerm(p.targetTerm).join(" ") !== normalizeTerm(item.term).join(" ")) problems.push(`tema calendario: el término debe ser el del ID ${item.id} («${item.term}»)`);
      if (item.pillar !== p.pillar) problems.push(`tema calendario: el ID ${item.id} es del pilar ${item.pillar}`);
      if (p.mix && item.mix !== p.mix) problems.push(`tema calendario: el ID ${item.id} es de ${item.mix}`);
    }
  }

  // REQ-963 (C2): sin texto copiado de las fichas enlazadas
  if (ctx.fichaTexts) {
    const body = allTexts.map(plainText).join(" \n ");
    for (const l of links) {
      const ref = ctx.fichaTexts[cleanPath(l.href)];
      if (!ref) continue;
      const frag = copiedFragments(body, ref);
      if (frag.length) problems.push(`C2: texto copiado de ${cleanPath(l.href)}: «${frag[0]}»`);
    }
  }

  const unique = [...new Set(problems)];
  return unique.length ? { ok: false, problems: unique } : { ok: true, post: p };
}
