/**
 * REQ-103: robots.txt servido por el sitio. Hoy el sitio no tiene uno (Cloudflare solo antepone sus "content signals");
 * esto solo hace explícito lo que ya pasa: todo permitido, con los buscadores de IA nombrados. Sin Disallow.
 * REQ-102: con PRIMERA_PIEZA_ENABLED se agrega la línea Sitemap (sitemap-index.xml); apagada, igual que hoy.
 * Dinámico (antes force-static) para leer la bandera del Worker en cada petición, no la del build.
 */
import { robotsTxt } from "@/seo/lib/robots";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";

export const dynamic = "force-dynamic";

export function GET() {
  const site = (process.env.SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, "");
  const sitemapUrl = isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED) ? `${site}/sitemap-index.xml` : undefined;
  return new Response(robotsTxt({ sitemapUrl }), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
