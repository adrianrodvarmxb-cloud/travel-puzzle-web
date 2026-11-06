/**
 * REQ-103: robots.txt servido por el sitio. Hoy el sitio no tiene uno (Cloudflare solo antepone sus "content signals");
 * esto solo hace explícito lo que ya pasa: todo permitido, con los buscadores de IA nombrados. Sin Disallow.
 * El Sitemap se agrega cuando existan los sitemaps (Ola 6 con slugs de la Ola 3).
 */
import { robotsTxt } from "@/seo/lib/robots";

export const dynamic = "force-static";

export function GET() {
  return new Response(robotsTxt({}), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
