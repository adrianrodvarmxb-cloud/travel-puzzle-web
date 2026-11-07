/**
 * I/O del blog: valida cada artículo del registro (inyectado) y descarta el inválido con un log; nunca tumba la página.
 * Mañana el registro puede venir de D1 (fase 2 del plan) sin cambiar la lógica: solo cambia `source`.
 */
import { parsePost, type Post, type PostInput } from "./lib/schema";
import { visiblePosts } from "./lib/registry";
import { POSTS } from "./content";

export interface BlogEnv { enabled: boolean; showDrafts: boolean; primeraPieza: boolean }

export function blogEnv(env: Record<string, string | undefined>): BlogEnv {
  return { enabled: env.BLOG_ENABLED === "true", showDrafts: env.BLOG_SHOW_DRAFTS === "true", primeraPieza: env.PRIMERA_PIEZA_ENABLED === "true" };
}

export function loadPosts(source: PostInput[] = POSTS, log: (l: string) => void = (l) => console.error(l)): Post[] {
  return source.flatMap((raw) => {
    const r = parsePost(raw);
    if (r.ok) return [r.post];
    log(`[blog] artículo descartado (${(raw as { slug?: string })?.slug ?? "sin slug"}): ${r.error}`);
    return [];
  });
}

/** Artículos que se ven con estas banderas (vacío si el blog está apagado). */
export function loadVisiblePosts(env: BlogEnv, source?: PostInput[]): Post[] {
  if (!env.enabled) return [];
  return visiblePosts(loadPosts(source), { showDrafts: env.showDrafts });
}
