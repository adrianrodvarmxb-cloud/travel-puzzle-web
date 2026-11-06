/**
 * REQ-103: llms.txt con La Primera Pieza y los destinos. Tras PRIMERA_PIEZA_ENABLED (apagada = 404, como hoy),
 * porque menciona páginas que aún no existen. Los destinos se agregan cuando haya slugs (Ola 3).
 */
import { llmsTxt } from "@/seo/lib/robots";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";

export const dynamic = "force-dynamic";

export function GET() {
  if (!isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED)) return new Response("Not found", { status: 404 });
  const siteUrl = process.env.SITE_URL || "https://travelpuzzle.com.mx";
  return new Response(llmsTxt({ siteUrl, destinations: [] }), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
