// REQ-3320 (gate D de docs/gates-cache-html.md): purga de la caché del borde de Cloudflare.
// Aquí solo se arman las peticiones y se leen las respuestas (funciones puras, sin fetch);
// el I/O vive en src/scripts/purgar-cache.ts. La Cache API del Worker (REQ-3498) vive en la
// misma caché de la zona, así que «purge_everything» también la vacía.

export const CF_API = "https://api.cloudflare.com/client/v4";
/** Tope de la API de Cloudflare por llamada de purga por URL. */
export const PURGE_URL_LOTE = 30;

export type PurgeRequest = { url: string; method: "POST"; body: string };

type CfErrors = { code?: number; message?: string }[];
type CfResponse = { success?: boolean; result?: unknown; errors?: CfErrors };

function asCf(json: unknown): CfResponse | null {
  return json && typeof json === "object" ? (json as CfResponse) : null;
}

// REQ-3320: todo al publicar.
export function purgeEverythingRequest(zoneId: string): PurgeRequest {
  return { url: `${CF_API}/zones/${zoneId}/purge_cache`, method: "POST", body: JSON.stringify({ purge_everything: true }) };
}

/** Solo URL https absolutas del propio sitio; sin repetidas; en lotes del tope de la API. */
// REQ-3320: las URL del viaje al guardar.
export function purgeUrlsRequests(zoneId: string, urls: string[], host: string): PurgeRequest[] {
  const limpias: string[] = [];
  for (const u of urls) {
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== host) continue;
    parsed.hash = "";
    const s = parsed.toString();
    if (!limpias.includes(s)) limpias.push(s);
  }
  const lotes: PurgeRequest[] = [];
  for (let i = 0; i < limpias.length; i += PURGE_URL_LOTE) {
    lotes.push({ url: `${CF_API}/zones/${zoneId}/purge_cache`, method: "POST", body: JSON.stringify({ files: limpias.slice(i, i + PURGE_URL_LOTE) }) });
  }
  return lotes;
}

/** Cuando no viene `CLOUDFLARE_ZONE_ID`, la zona se busca por nombre (necesita permiso Zone:Read en el token). */
export function zoneLookupUrl(host: string): string {
  return `${CF_API}/zones?name=${encodeURIComponent(host)}&status=active`;
}

export function zoneIdFromLookup(json: unknown): string | null {
  const cf = asCf(json);
  if (!cf?.success || !Array.isArray(cf.result)) return null;
  const primero = cf.result[0] as { id?: unknown } | undefined;
  return typeof primero?.id === "string" && primero.id ? primero.id : null;
}

/** Veredicto legible para el registro del workflow; nunca incluye el token (solo códigos y mensajes de la API, recortados). */
export function purgeOutcome(status: number, json: unknown, ocultar?: string): { ok: boolean; motivo: string } {
  const cf = asCf(json);
  if (status >= 200 && status < 300 && cf?.success) return { ok: true, motivo: "purgada" };
  const limpiar = (m: string) => (ocultar ? m.split(ocultar).join("…") : m).replace(/\b[A-Za-z0-9_-]{32,}\b/g, "…").slice(0, 120);
  const errores = (cf?.errors ?? []).map((e) => `${e.code ?? "?"} ${limpiar(String(e.message ?? ""))}`).join("; ");
  return { ok: false, motivo: `HTTP ${status}${errores ? `: ${errores}` : ""}` };
}

export function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
