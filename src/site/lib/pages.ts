/**
 * Páginas institucionales tras bandera (encargo del PO, 6 nov 2026). Puro.
 * REQ-240: cada página existe solo con su bandera en "true" exacto; apagada responde 404.
 * REQ-241: los enlaces van en el pie (decisión D3), nunca en el menú principal.
 * REQ-242: la prueba de humo agrega cada página solo con su bandera encendida.
 */
export const PAGE_FLAGS = {
  nosotros: "NOSOTROS_ENABLED",
  contacto: "CONTACTO_ENABLED",
} as const;

export type SitePageKey = keyof typeof PAGE_FLAGS;
export type SitePages = Record<SitePageKey, boolean>;

export const PAGE_PATHS: Record<SitePageKey, string> = {
  nosotros: "/nosotros",
  contacto: "/contacto",
};

const LABELS: Record<SitePageKey, { es: string; en: string }> = {
  nosotros: { es: "Nosotros", en: "About us" },
  contacto: { es: "Contacto", en: "Contact" },
};

// REQ-240
export function sitePagesFromEnv(env: Record<string, string | undefined>): SitePages {
  return Object.fromEntries(Object.entries(PAGE_FLAGS).map(([k, flag]) => [k, env[flag] === "true"])) as SitePages;
}

/** Nombre visible de la página (igual al H1). */
export function pageLabel(key: SitePageKey, lang: string): string {
  return lang === "es" ? LABELS[key].es : LABELS[key].en;
}

// REQ-241
export function footerPageLinks(pages: Partial<SitePages> | undefined, lang: string): { href: string; label: string }[] {
  if (!pages) return [];
  return (Object.keys(PAGE_FLAGS) as SitePageKey[]).filter((k) => pages[k]).map((k) => ({ href: PAGE_PATHS[k], label: pageLabel(k, lang) }));
}

/** Variables "vars" de wrangler.jsonc (solo pares "NOMBRE": "valor"). */
export function wranglerVars(jsonc: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of jsonc.matchAll(/"([A-Z][A-Z0-9_]*)":\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

// REQ-242: páginas de la prueba de humo que dependen de una bandera. El entorno del runner manda sobre wrangler.
export function flaggedSmokePages(flagged: Record<string, string[]> | undefined, vars: Record<string, string>, env: Record<string, string | undefined>): string[] {
  if (!flagged) return [];
  return Object.entries(flagged).filter(([flag]) => (env[flag] ?? vars[flag]) === "true").flatMap(([, paths]) => paths);
}
