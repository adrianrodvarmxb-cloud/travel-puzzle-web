/**
 * REQ-3320 — Purga la caché del borde de Cloudflare (gate D de docs/gates-cache-html.md).
 * Uso:
 *   npx tsx src/scripts/purgar-cache.ts todo                 → purga toda la zona (al publicar)
 *   npx tsx src/scripts/purgar-cache.ts urls <url> [<url>…]  → purga solo esas URL del sitio (al guardar un viaje)
 * Variables: CLOUDFLARE_PURGE_TOKEN (secreto, solo de purga; nunca se imprime), CLOUDFLARE_ZONE_ID (opcional: si no
 * viene, se busca la zona por nombre y el token necesita Zone:Read), SITE_HOST (por defecto travelpuzzle.com.mx).
 * Sale con código 1 si no pudo purgar; el workflow lo corre con continue-on-error, así que no tumba el deploy.
 */
import { authHeaders, purgeEverythingRequest, purgeOutcome, purgeUrlsRequests, zoneIdFromLookup, zoneLookupUrl, type PurgeRequest } from "../ops/lib/purge";

const host = process.env.SITE_HOST || "travelpuzzle.com.mx";
const token = process.env.CLOUDFLARE_PURGE_TOKEN;
const [modo = "todo", ...urls] = process.argv.slice(2);

async function leerJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function zona(headers: Record<string, string>): Promise<string | null> {
  if (process.env.CLOUDFLARE_ZONE_ID) return process.env.CLOUDFLARE_ZONE_ID;
  const res = await fetch(zoneLookupUrl(host), { headers });
  const id = zoneIdFromLookup(await leerJson(res));
  if (!id) console.error(`[purga] no se pudo leer la zona de ${host} (HTTP ${res.status}); da el id en la variable CLOUDFLARE_ZONE_ID o permiso Zone:Read al token`);
  return id;
}

async function ejecutar(peticiones: PurgeRequest[], headers: Record<string, string>): Promise<boolean> {
  let todoBien = true;
  for (const p of peticiones) {
    const res = await fetch(p.url, { method: p.method, headers, body: p.body });
    const v = purgeOutcome(res.status, await leerJson(res), token);
    console.log(`[purga] ${v.ok ? "OK" : "FALLÓ"} ${v.motivo} (${JSON.parse(p.body).files?.length ?? "toda la zona"})`);
    if (!v.ok) todoBien = false;
  }
  return todoBien;
}

async function main(): Promise<number> {
  if (!token) {
    console.error("[purga] falta CLOUDFLARE_PURGE_TOKEN; no se purga nada");
    return 1;
  }
  const headers = authHeaders(token);
  const zoneId = await zona(headers);
  if (!zoneId) return 1;
  const peticiones = modo === "urls" ? purgeUrlsRequests(zoneId, urls, host) : [purgeEverythingRequest(zoneId)];
  if (peticiones.length === 0) {
    console.log("[purga] ninguna URL válida del sitio; nada que purgar");
    return 0;
  }
  return (await ejecutar(peticiones, headers)) ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("[purga] error", e instanceof Error ? e.message : e);
    process.exit(1);
  });
