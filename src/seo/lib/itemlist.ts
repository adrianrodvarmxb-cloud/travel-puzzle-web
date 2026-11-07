/**
 * REQ-582: ItemList de los listados (/tours, /destinos, país, ciudad, /la-primera-pieza y carruseles del inicio).
 * Puro. ListItem con url y name (lista resumen): barato y válido en schema.org, aunque los carruseles de Google no
 * apliquen hoy en México. Cada URL es la canónica final: una tarjeta /tours/{id} que redirige (301) a su ficha de
 * /destinos se lista con esa URL. Máximo 50 elementos para no inflar el HTML.
 */
import { allTours, type CountryNode } from "@/destinations/lib/catalog";

export const ITEMLIST_MAX = 50;
const LEGACY = /^\/tours\/([^/?#]+)$/;
const VIAJE = /^\/viajes\/[^/]+\/([^/?#]+)$/;

/** id de tour → href de /destinos, y slug de viaje → href de /destinos (los que el middleware redirige con 301). */
export function canonicalHrefs(tree: CountryNode[] | null): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of tree ?? []) for (const ci of c.cities) for (const t of allTours(ci)) {
    if (t.kind === "own") m.set(`viaje:${t.href.split("/").pop()}`, t.href);
    else m.set(`tour:${t.id}`, t.href);
  }
  return m;
}

function canonical(href: string, resolve?: Map<string, string>): string {
  const legacy = href.match(LEGACY);
  if (legacy && resolve?.has(`tour:${legacy[1]}`)) return resolve.get(`tour:${legacy[1]}`)!;
  const viaje = href.match(VIAJE);
  if (viaje && resolve?.has(`viaje:${viaje[1]}`)) return resolve.get(`viaje:${viaje[1]}`)!;
  return href;
}

// REQ-582
export function itemListJsonLd({ siteUrl, name, items, resolve }: { siteUrl: string; name: string; items: { name: string; href: string }[]; resolve?: Map<string, string> }) {
  const site = siteUrl.replace(/\/+$/, "");
  const seen = new Set<string>();
  const list: { "@type": "ListItem"; position: number; name: string; url: string }[] = [];
  for (const it of items) {
    const n = (it.name ?? "").trim();
    if (!n || !it.href) continue;
    const href = canonical(it.href, resolve);
    const url = /^https?:\/\//.test(href) ? href : `${site}${href.startsWith("/") ? href : `/${href}`}`;
    if (seen.has(url)) continue;
    seen.add(url);
    list.push({ "@type": "ListItem", position: list.length + 1, name: n, url });
    if (list.length === ITEMLIST_MAX) break;
  }
  if (!list.length) return null;
  return { "@context": "https://schema.org", "@type": "ItemList", name, numberOfItems: list.length, itemListElement: list };
}
