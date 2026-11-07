/**
 * Registro del blog: visibilidad, canibalización, relacionados y verificador de enlaces. Puro.
 * REQ-256: solo publicados (los borradores, solo con BLOG_SHOW_DRAFTS en preview); nunca de un pilar bloqueado.
 * REQ-257: «Blog» en el pie con la bandera y ≥3 artículos visibles (no se enlaza una sección vacía).
 * REQ-258: un slug y un término objetivo por artículo. REQ-259: relacionados desde los datos.
 * REQ-272: enlaces en el texto al pilar, a un hermano y a la página comercial; sin «aquí» ni rutas apagadas.
 */
import type { Post } from "./schema";
import { PILLARS, pillarBySlug, commercialHref, offRoutes, type Pillar } from "./pillars";
import { inlineLinks } from "./inline";

export const BLOG_NAV_MIN_POSTS = 3;
export const postPath = (p: Pick<Post, "pillar" | "slug">) => `/blog/${p.pillar}/${p.slug}`;
export const pillarPath = (slug: string) => `/blog/${slug}`;

const byDateDesc = (a: Post, b: Post) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : a.slug.localeCompare(b.slug));
const active = (p: Post) => pillarBySlug(p.pillar)?.status === "activo";

// REQ-256
export function visiblePosts(posts: Post[], opts: { showDrafts: boolean }): Post[] {
  return posts.filter((p) => active(p) && (!p.draft || opts.showDrafts));
}

// REQ-257
export function blogNavVisible(flag: boolean, visible: Post[]): boolean {
  return flag && visible.length >= BLOG_NAV_MIN_POSTS;
}

// REQ-258
export function duplicates(posts: Post[]): string[] {
  const out: string[] = [];
  const seen = (key: (p: Post) => string, label: string) => {
    const s = new Set<string>();
    for (const p of posts) {
      const k = key(p);
      if (s.has(k)) out.push(`${label}: ${k}`);
      s.add(k);
    }
  };
  seen((p) => p.slug, "slug repetido");
  seen((p) => p.targetTerm.trim().toLowerCase(), "término repetido");
  return out;
}

// REQ-259
export function related(post: Post, all: Post[]) {
  const same = all.filter((p) => p.pillar === post.pillar).sort(byDateDesc);
  const chrono = [...same].reverse();
  const i = chrono.findIndex((p) => p.slug === post.slug);
  return {
    siblings: same.filter((p) => p.slug !== post.slug).slice(0, 3),
    prev: i > 0 ? chrono[i - 1] : null,
    next: i >= 0 && i < chrono.length - 1 ? chrono[i + 1] : null,
    explore: PILLARS.map((pillar) => ({ pillar, posts: all.filter((p) => p.pillar === pillar.slug).sort(byDateDesc) })).filter((g) => g.posts.length > 0),
  };
}

// REQ-259: resúmenes del pilar desde el registro; sin artículos, vacío (el bloque no aparece).
export function pillarSummaries(pillar: string, posts: Post[]): { title: string; summary: string; href: string }[] {
  return posts.filter((p) => p.pillar === pillar).sort(byDateDesc).map((p) => ({ title: p.title, summary: p.summary, href: postPath(p) }));
}

/** Pilares activos con al menos un artículo visible (los únicos que tienen página y filtro). */
export function pillarsWithPosts(posts: Post[]): Pillar[] {
  return PILLARS.filter((pl) => pl.status === "activo" && posts.some((p) => p.pillar === pl.slug));
}

const GENERIC = /^(aqu[ií]|clic|click|haz clic|aqu[ií] mismo|ver m[aá]s|here|click here)$/i;

// REQ-272
export function linkProblems(post: Post, all: Post[], flags: { primeraPieza: boolean }): string[] {
  const texts = [post.entrada, ...post.sections.flatMap((s) => [s.answer, ...s.body, ...(s.list ?? [])])];
  const links = texts.flatMap(inlineLinks);
  const problems: string[] = [];
  for (const l of links) if (GENERIC.test(l.text.trim())) problems.push(`texto de enlace genérico: «${l.text}»`);
  const off = offRoutes(flags);
  for (const l of links) if (off.some((re) => re.test(l.href))) problems.push(`enlace a ruta apagada: ${l.href}`);
  const hrefs = links.map((l) => l.href.split("#")[0]);
  if (!hrefs.includes(pillarPath(post.pillar))) problems.push(`falta enlace al pilar ${pillarPath(post.pillar)}`);
  const sibs = all.filter((p) => p.pillar === post.pillar && p.slug !== post.slug).map(postPath);
  if (sibs.length && !hrefs.some((h) => sibs.includes(h))) problems.push("falta enlace a un artículo hermano");
  const pillar = pillarBySlug(post.pillar);
  if (pillar && !hrefs.includes(commercialHref(pillar, flags.primeraPieza))) problems.push("falta enlace a la página comercial");
  return problems;
}
