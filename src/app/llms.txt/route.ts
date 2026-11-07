/**
 * REQ-103: llms.txt con La Primera Pieza y los destinos. Tras PRIMERA_PIEZA_ENABLED (apagada = 404, como hoy).
 * Los destinos son los países indexables de /destinos (con slugs); si la base falla, sale sin la lista.
 * REQ-973: suma «## Blog» con las entradas publicadas más recientes.
 */
import { llmsTxt } from "@/seo/lib/robots";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";
import { getDestinations, siteUrl } from "@/destinations/server";
import { sitePagesForLlms, blogForLlms } from "@/site/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED)) return new Response("Not found", { status: 404 });
  const site = siteUrl().replace(/\/+$/, "");
  const tree = await getDestinations().catch((e) => { console.error("[llms.txt] sin destinos:", (e as Error).message); return []; });
  const destinations = tree.filter((c) => c.indexable).map((c) => ({ name: c.name, url: `${site}${c.href}` }));
  return new Response(llmsTxt({ siteUrl: site, destinations, pages: sitePagesForLlms(), blog: blogForLlms() }), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
