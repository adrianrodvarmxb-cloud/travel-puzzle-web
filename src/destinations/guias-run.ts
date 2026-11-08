/**
 * Raíz con I/O de las guías de ciudad (REQ-1225, REQ-1226, REQ-1229, REQ-1232). La lógica vive en lib/guia.ts; aquí se
 * juntan rutas publicadas (sitemaps de producción), texto de la página de la ciudad (C2), términos del blog y fecha.
 */
import { guideProblems, guideCityPath, nextGuideCities, GUIDES_PER_DAY, type CityGuide, type CityGuideInput } from "./lib/guia";
import { loadGuides } from "./guias";
import { ORDEN_GUIAS } from "./content/guias-orden";
import { knownPathsFromSitemaps, visibleText, todayCdmx, registryPosts } from "@/blog/diario-run";
import { PILLARS } from "@/blog/lib/pillars";
import { CALENDARIO } from "@/blog/content/calendario";

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

/** Términos que una guía no puede repetir: artículos del blog, pilares y calendario. */
export function blogTerms(): { term: string; label: string }[] {
  return [
    ...registryPosts().map((p) => ({ term: p.targetTerm, label: p.slug })),
    ...PILLARS.map((p) => ({ term: p.term, label: `pilar ${p.slug}` })),
    ...CALENDARIO.map((c) => ({ term: c.term, label: c.id })),
  ];
}

// REQ-1232 + REQ-1236: valida de 1 a 5 guías contra el sitio y entre sí (cada una ve a las anteriores como existentes).
export async function validateGuidesAgainstSite(inputs: CityGuideInput[], o: { siteUrl: string; fetch: Fetch; now: Date; today?: string; existing?: CityGuide[] }): Promise<{ ok: true; guides: CityGuide[] } | { ok: false; problems: string[] }> {
  const site = o.siteUrl.replace(/\/+$/, "");
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > GUIDES_PER_DAY) return { ok: false, problems: [`el archivo trae de 1 a ${GUIDES_PER_DAY} guías (arreglo JSON)`] };
  const knownPaths = await knownPathsFromSitemaps(site, o.fetch);
  const today = o.today ?? todayCdmx(o.now);
  const existing = [...(o.existing ?? loadGuides())];
  const otherTerms = blogTerms();
  const problems: string[] = [];
  const ok: CityGuide[] = [];
  for (const [i, input] of inputs.entries()) {
    const path = `/destinos/${(input as { pais?: string }).pais}/${(input as { ciudad?: string }).ciudad}`;
    const page = await o.fetch(`${site}${path}`).catch(() => null);
    const cityText = page?.ok ? visibleText(await page.text()) : undefined;
    const r = guideProblems(input, { today, existing, knownPaths, otherTerms, cityText });
    if (r.ok) { ok.push(r.guide); existing.push(r.guide); } else problems.push(...r.problems.map((p) => `guía ${i + 1} (${path}): ${p}`));
  }
  return problems.length ? { ok: false, problems } : { ok: true, guides: ok };
}

/** REQ-1229: ciudades por número de experiencias publicadas (fichas en los sitemaps), de más a menos. */
export function citiesByExperiences(paths: Set<string>): string[] {
  const n = new Map<string, number>();
  for (const p of paths) { const m = /^\/destinos\/([a-z]{2})\/([a-z0-9-]+)\/[^/]+$/.exec(p); if (m) n.set(`${m[1]}/${m[2]}`, (n.get(`${m[1]}/${m[2]}`) ?? 0) + 1); }
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
}

// REQ-1229 + REQ-1236: las 5 ciudades que tocan hoy.
export async function guidesForToday(o: { siteUrl: string; fetch: Fetch }): Promise<{ ciudades: string[]; publicadas: number }> {
  const paths = await knownPathsFromSitemaps(o.siteUrl, o.fetch);
  const existing = loadGuides();
  const withPage = (k: string) => paths.has(`/destinos/${k}`);
  return { ciudades: nextGuideCities({ order: ORDEN_GUIAS.filter(withPage), byExperiences: citiesByExperiences(paths), existing }), publicadas: existing.length };
}

export { guideCityPath };
