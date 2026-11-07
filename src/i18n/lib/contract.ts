/**
 * REQ-676 (Gate 3, Ola 3): contrato hreflang/canonical sobre el `<head>` crudo del servidor (lo que lee un bot).
 * Puro. Se compara por ruta (la versión sin tráfico tiene otro dominio que el canonical de producción).
 * Falla si una página indexable: no tiene hreflang, no se lista a sí misma, le falta x-default, no es recíproca con
 * sus alternas, o su canonical es de otro idioma (u otra página); si `<html lang>` no es el de la URL; o si una
 * página noindex lleva hreflang (REQ-662).
 */
import { splitLocale } from "./path";

export interface LocaleHead { lang: string | null; canonical: string | null; noindex: boolean; alternates: Record<string, string> }

const attr = (tag: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag)?.[1] ?? null;
const pathOf = (href: string) => { try { return norm(new URL(href, "https://x.invalid").pathname); } catch { return href; } };
const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p) || "/";

// REQ-676
export function parseLocaleHead(html: string): LocaleHead {
  const head = /<head[\s>][\s\S]*?<\/head>/i.exec(html)?.[0] ?? html;
  const tags = head.match(/<(link|meta)\b[^>]*>/gi) ?? [];
  let canonical: string | null = null;
  let noindex = false;
  const alternates: Record<string, string> = {};
  for (const t of tags) {
    const rel = attr(t, "rel")?.toLowerCase();
    if (rel === "canonical" && attr(t, "href")) canonical = pathOf(attr(t, "href")!);
    if (rel === "alternate" && attr(t, "hreflang") && attr(t, "href")) alternates[attr(t, "hreflang")!] = pathOf(attr(t, "href")!);
    if (attr(t, "name")?.toLowerCase() === "robots" && /noindex/i.test(attr(t, "content") ?? "")) noindex = true;
  }
  return { lang: /<html\b[^>]*\blang\s*=\s*"([^"]*)"/i.exec(html)?.[1] ?? null, canonical, noindex, alternates };
}

const same = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
};

// REQ-676: `pages` = ruta pedida → HTML crudo.
export function hreflangContractFailures(pages: Record<string, string>): string[] {
  const heads = new Map(Object.entries(pages).map(([p, html]) => [norm(p), parseLocaleHead(html)] as const));
  const out: string[] = [];
  for (const [path, h] of heads) {
    const { lang } = splitLocale(path);
    if (h.lang !== lang) out.push(`${path}: <html lang="${h.lang}"> y la URL es ${lang}`);
    if (!h.canonical) out.push(`${path}: sin canonical`);
    else if (splitLocale(h.canonical).lang !== lang) out.push(`${path}: canonical de otro idioma (${h.canonical})`);
    else if (h.canonical !== path) out.push(`${path}: canonical a otra página (${h.canonical})`);
    const alts = Object.keys(h.alternates);
    if (h.noindex) { if (alts.length) out.push(`${path}: noindex con hreflang`); continue; }
    if (!alts.length) { out.push(`${path}: indexable sin hreflang`); continue; }
    if (h.alternates[lang] !== path) out.push(`${path}: no se lista a sí misma en hreflang (${lang})`);
    if (!h.alternates["x-default"]) out.push(`${path}: le falta x-default`);
    for (const [l, p] of Object.entries(h.alternates)) {
      if (l === "x-default" || p === path) continue;
      const other = heads.get(p);
      if (!other) out.push(`${path}: alterna ${l} ${p} no se pudo verificar (sin HTML)`);
      else if (!same(other.alternates, h.alternates)) out.push(`${path}: hreflang no es recíproco con ${p}`);
    }
  }
  return out;
}
