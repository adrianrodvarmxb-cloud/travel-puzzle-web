/**
 * Raíz con I/O del blog diario (REQ-968, REQ-963, REQ-975). La lógica vive en lib/diario.ts; aquí solo se juntan las
 * dependencias: rutas de los sitemaps de producción, texto de las fichas enlazadas, registro y fecha de CDMX.
 * Todo llega por parámetro (fetch, reloj) para poder probarlo sin red.
 */
import { validateDailyEntry, FIXED_PATHS, type DailyResult } from "./lib/diario";
import { parsePost, type Post, type PostInput } from "./lib/schema";
import { inlineLinks } from "./lib/inline";
import { FREE_TOUR_POSTS_B1, planDelDia, type Plan } from "./lib/mix";
import { CALENDARIO } from "./content/calendario";
import { POSTS } from "./content";

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

/** Fecha AAAA-MM-DD en la Ciudad de México (script de servidor; nunca en un componente). */
export function todayCdmx(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Rutas publicadas según los sitemaps (índice → cada archivo). Un archivo que falla se omite y se avisa. */
export async function knownPathsFromSitemaps(siteUrl: string, fetchFn: Fetch, log: (l: string) => void = console.error): Promise<Set<string>> {
  const site = siteUrl.replace(/\/+$/, "");
  const paths = new Set<string>(FIXED_PATHS);
  const index = await fetchFn(`${site}/sitemap-index.xml`);
  if (!index.ok) throw new Error(`sitemap-index.xml respondió ${index.status}`);
  const files = [...(await index.text()).matchAll(/<loc>([^<]+\.xml)<\/loc>/g)].map((m) => m[1]);
  for (const f of files) {
    const r = await fetchFn(f).catch(() => null);
    if (!r?.ok) { log(`[blog-diario] no se pudo leer ${f}`); continue; }
    for (const m of (await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try { paths.add(new URL(m[1].replace(/&amp;/g, "&")).pathname.replace(/\/+$/, "") || "/"); } catch { /* URL rota: se ignora */ }
    }
  }
  return paths;
}

/** Texto visible de una página del sitio (sin scripts ni etiquetas), para la regla C2. */
export function visibleText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

const FICHA = /^\/(destinos\/[^/]+\/[^/]+\/[^/?#]+|viajes\/[^/]+\/[^/?#]+)$/;

/** Texto de las fichas que enlaza la entrada (máx. 12). */
export async function fichaTextsFor(input: PostInput, siteUrl: string, fetchFn: Fetch): Promise<Record<string, string>> {
  const site = siteUrl.replace(/\/+$/, "");
  const texts = [input.entrada, input.enBreve, ...(input.sections ?? []).flatMap((s) => [s.answer, ...(s.body ?? []), ...(s.list ?? [])])];
  const fichas = [...new Set(texts.flatMap(inlineLinks).map((l) => l.href.split(/[?#]/)[0]).filter((h) => FICHA.test(h)))].slice(0, 12);
  const out: Record<string, string> = {};
  for (const f of fichas) {
    const r = await fetchFn(`${site}${f}`).catch(() => null);
    if (r?.ok) out[f] = visibleText(await r.text());
  }
  return out;
}

export function registryPosts(source: PostInput[] = POSTS): Post[] {
  return source.flatMap((raw) => { const r = parsePost(raw); return r.ok ? [r.post] : []; });
}

// REQ-975: valida una entrada contra producción (rutas y fichas) y el registro actual.
export async function validateAgainstSite(input: PostInput, o: { siteUrl: string; fetch: Fetch; now: Date; today?: string; primeraPieza: boolean; source?: PostInput[] }): Promise<DailyResult> {
  const [knownPaths, fichaTexts] = await Promise.all([knownPathsFromSitemaps(o.siteUrl, o.fetch), fichaTextsFor(input, o.siteUrl, o.fetch)]);
  return validateDailyEntry(input, {
    today: o.today ?? todayCdmx(o.now),
    existing: registryPosts(o.source),
    knownPaths,
    primeraPieza: o.primeraPieza,
    b1FreeTours: FREE_TOUR_POSTS_B1,
    calendar: CALENDARIO,
    fichaTexts,
  });
}

// REQ-962, REQ-983: plan del día para el agente.
export function planForToday(now: Date, source?: PostInput[]): Plan & { today: string } {
  const today = todayCdmx(now);
  const posts = registryPosts(source).map((p) => ({ publishedAt: p.publishedAt, mix: p.mix, draft: p.draft, clusterId: p.tema?.clusterId, targetTerm: p.targetTerm }));
  return { today, ...planDelDia({ posts, calendar: CALENDARIO, today, b1: FREE_TOUR_POSTS_B1 }) };
}
