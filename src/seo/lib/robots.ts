/**
 * robots.txt y llms.txt. Puros. Nunca se bloquea una página en robots.txt: lo que no se debe indexar
 * va con noindex (REQ-089). llms.txt no copia textos de FREETOUR ni lo nombra.
 */
import { ROUTES } from "@/destinations/lib/routes";
import { PRIMERA_PIEZA_LABEL } from "@/tours/lib/menu";
import { catalogName } from "@/tours/lib/catalog-name";

export const AI_SEARCH_BOTS = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Claude-User"] as const;

// REQ-103 REQ-585: sin Disallow; Bingbot y Googlebot caen en «*» (Allow: /).
export function robotsTxt({ sitemapUrl }: { sitemapUrl?: string }): string {
  const groups = ["*", ...AI_SEARCH_BOTS].map((ua) => `User-agent: ${ua}\nAllow: /`);
  return `${groups.join("\n\n")}\n${sitemapUrl ? `\nSitemap: ${sitemapUrl}\n` : ""}`;
}

// REQ-103: llms.txt con La Primera Pieza y los destinos (formato llmstxt.org).
// REQ-973: «## Blog» con las entradas publicadas más recientes (solo si hay).
export function llmsTxt({ siteUrl, destinations, pages = [], blog = [] }: { siteUrl: string; destinations: { name: string; url: string }[]; pages?: { name: string; url: string }[]; blog?: { name: string; url: string }[] }): string {
  const site = siteUrl.replace(/\/+$/, "");
  return [
    "# Travel Puzzle",
    "",
    "> Agencia de viajes en línea: free tours, tours y traslados con guías locales, y un asesor en español por WhatsApp.",
    "",
    "## Secciones",
    "",
    `- [${PRIMERA_PIEZA_LABEL}](${site}${ROUTES.primeraPieza}): colección de free tours; reservar es gratis y al final cada quien decide cuánto darle al guía.`,
    `- [Destinos](${site}${ROUTES.destinos}): países y ciudades con sus free tours, tours y traslados.`,
    // REQ-173 + REQ-174: misma etiqueta que el menú; la URL sigue siendo /tours.
    `- [${catalogName("es")}](${site}/tours): buscador de experiencias.`,
    "",
    ...(destinations.length ? ["## Destinos", "", ...destinations.map((d) => `- [${d.name}](${d.url})`), ""] : []),
    // REQ-276: páginas institucionales y blog encendidos.
    ...(pages.length ? ["## Páginas", "", ...pages.map((p) => `- [${p.name}](${p.url})`), ""] : []),
    ...(blog.length ? ["## Blog", "", ...blog.map((p) => `- [${p.name}](${p.url})`), ""] : []),
  ].join("\n");
}
