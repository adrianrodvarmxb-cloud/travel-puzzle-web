/**
 * REQ-1076…1079: llamadas a las API de redes, como datos (puro). Los tokens llegan por parámetro desde secretos de
 * GitHub; nunca viven en el repo. El script src/scripts/redes-diario.ts hace el fetch.
 * - Facebook (página): Graph API POST /{page-id}/feed.
 * - Instagram (cuenta business): POST /{ig-user-id}/media (una por lámina, is_carousel_item) → carrusel → /media_publish.
 * - LinkedIn (página de empresa): Community Management API, POST /rest/posts con author urn:li:organization.
 */
export type RedName = "linkedin" | "facebook" | "instagram";
/** Versiones por omisión; se cambian con las variables del repo META_GRAPH_VERSION y LINKEDIN_API_VERSION. */
export const GRAPH_VERSION_DEFAULT = "v23.0";
export const LINKEDIN_VERSION_DEFAULT = "202609";

type Env = Record<string, string | undefined>;

// REQ-1076: SOCIAL_*_ENABLED en wrangler.jsonc, todas en "false" hasta que el PO conecte cada red.
export function socialFlags(vars: Env): Record<RedName, boolean> {
  return { linkedin: vars.SOCIAL_LINKEDIN_ENABLED === "true", facebook: vars.SOCIAL_FACEBOOK_ENABLED === "true", instagram: vars.SOCIAL_INSTAGRAM_ENABLED === "true" };
}

const NEEDS: Record<RedName, string[]> = {
  facebook: ["META_PAGE_ID", "META_PAGE_TOKEN"],
  instagram: ["META_IG_USER_ID", "META_PAGE_TOKEN"],
  linkedin: ["LINKEDIN_ORG_ID", "LINKEDIN_TOKEN"],
};
const FLAG: Record<RedName, string> = { facebook: "SOCIAL_FACEBOOK_ENABLED", instagram: "SOCIAL_INSTAGRAM_ENABLED", linkedin: "SOCIAL_LINKEDIN_ENABLED" };

export type Manual = { mode: "manual"; motivo: string };
export interface RedesConfig {
  facebook: { mode: "auto"; pageId: string; token: string; graph: string } | Manual;
  instagram: { mode: "auto"; igUserId: string; token: string; graph: string } | Manual;
  linkedin: { mode: "auto"; orgId: string; token: string; version: string } | Manual;
}

// REQ-1076 + REQ-1081: sin bandera o sin secretos, la red queda en «manual» (textos listos para copiar y pegar).
export function redesConfig(vars: Env, secrets: Env): RedesConfig {
  const flags = socialFlags(vars);
  const graph = secrets.META_GRAPH_VERSION || GRAPH_VERSION_DEFAULT;
  const why = (r: RedName): Manual | null => {
    if (!flags[r]) return { mode: "manual", motivo: `${FLAG[r]} apagada` };
    const missing = NEEDS[r].filter((k) => !secrets[k]);
    return missing.length ? { mode: "manual", motivo: `faltan secretos: ${missing.join(", ")}` } : null;
  };
  return {
    facebook: why("facebook") ?? { mode: "auto", pageId: secrets.META_PAGE_ID!, token: secrets.META_PAGE_TOKEN!, graph },
    instagram: why("instagram") ?? { mode: "auto", igUserId: secrets.META_IG_USER_ID!, token: secrets.META_PAGE_TOKEN!, graph },
    linkedin: why("linkedin") ?? { mode: "auto", orgId: secrets.LINKEDIN_ORG_ID!, token: secrets.LINKEDIN_TOKEN!, version: secrets.LINKEDIN_API_VERSION || LINKEDIN_VERSION_DEFAULT },
  };
}

export interface FormRequest { url: string; method: "POST"; form: Record<string, string> }
const graphUrl = (graph: string, path: string) => `https://graph.facebook.com/${graph}/${path}`;

// REQ-1077
/** REQ-1501: lectura de los últimos posts de la página, para no repetir una entrada ya publicada. */
export function facebookFeedUrl(c: { pageId: string; token: string; graph: string }): string {
  return graphUrl(c.graph, `${c.pageId}/feed?fields=message&limit=50&access_token=${encodeURIComponent(c.token)}`);
}

/** REQ-1501: id del post de la página que ya lleva el enlace canónico de la entrada (sin utm), o undefined. */
export function postPrevioEnPagina(data: unknown, urlCanonica: string): string | undefined {
  const posts = (data as { data?: unknown[] } | null)?.data ?? [];
  const hit = posts.find((p) => typeof (p as { message?: unknown }).message === "string" && (p as { message: string }).message.includes(urlCanonica));
  return hit ? String((hit as { id?: unknown }).id ?? "sin id") : undefined;
}

/** REQ-1503: lectura de las últimas fotos de la cuenta de Instagram, para no repetir una entrada ya publicada. */
export function instagramMediaUrl(c: { igUserId: string; token: string; graph: string }): string {
  return graphUrl(c.graph, `${c.igUserId}/media?fields=caption&limit=50&access_token=${encodeURIComponent(c.token)}`);
}

/** REQ-1503: id de la publicación de Instagram cuya caption abre igual que la de esta entrada, o undefined. */
export function mediaPreviaEnInstagram(data: unknown, caption: string): string | undefined {
  const titulo = caption.split("\n")[0].trim();
  const posts = (data as { data?: unknown[] } | null)?.data ?? [];
  const hit = posts.find((p) => typeof (p as { caption?: unknown }).caption === "string" && (p as { caption: string }).caption.trim().startsWith(titulo));
  return hit ? String((hit as { id?: unknown }).id ?? "sin id") : undefined;
}

export function facebookPostRequest(c: { pageId: string; token: string; graph: string }, message: string, link: string): FormRequest {
  return { url: graphUrl(c.graph, `${c.pageId}/feed`), method: "POST", form: { message, link, access_token: c.token } };
}

type IgCfg = { igUserId: string; token: string; graph: string };
// REQ-1078
export function instagramChildRequest(c: IgCfg, imageUrl: string): FormRequest {
  return { url: graphUrl(c.graph, `${c.igUserId}/media`), method: "POST", form: { image_url: imageUrl, is_carousel_item: "true", access_token: c.token } };
}
export function instagramCarouselRequest(c: IgCfg, children: string[], caption: string): FormRequest {
  return { url: graphUrl(c.graph, `${c.igUserId}/media`), method: "POST", form: { media_type: "CAROUSEL", children: children.join(","), caption, access_token: c.token } };
}
export function instagramSingleRequest(c: IgCfg, imageUrl: string, caption: string): FormRequest {
  return { url: graphUrl(c.graph, `${c.igUserId}/media`), method: "POST", form: { image_url: imageUrl, caption, access_token: c.token } };
}
export function instagramPublishRequest(c: IgCfg, creationId: string): FormRequest {
  return { url: graphUrl(c.graph, `${c.igUserId}/media_publish`), method: "POST", form: { creation_id: creationId, access_token: c.token } };
}

/** REQ-1079: formato «little text» de LinkedIn: escapa los reservados y convierte #Palabra en plantilla de hashtag. */
export function littleText(s: string): string {
  const tags: string[] = [];
  const marked = s.replace(/#(\p{L}[\p{L}\d]*)/gu, (_, t: string) => { tags.push(t); return `\u0000${tags.length - 1}\u0000`; });
  const escaped = marked.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
  return escaped.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `{hashtag|\\#|${tags[Number(i)]}}`);
}

// REQ-1079
export function linkedinPostRequest(c: { orgId: string; token: string; version: string }, text: string, article: { url: string; title: string; description: string }) {
  return {
    url: "https://api.linkedin.com/rest/posts",
    method: "POST" as const,
    headers: { Authorization: `Bearer ${c.token}`, "LinkedIn-Version": c.version, "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json" },
    json: {
      author: `urn:li:organization:${c.orgId}`,
      commentary: littleText(text),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { article: { source: article.url, title: article.title, description: article.description } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    },
  };
}

/** REQ-1085: Meta rechaza publicar en la página con el token de usuario de sistema; primero se pide su token de página. */
export function paginaTokenUrl(c: { graph: string; pageId: string; token: string }): string {
  return `${graphUrl(c.graph, c.pageId)}?fields=access_token&access_token=${encodeURIComponent(c.token)}`;
}

/** REQ-1085: extrae el access_token de página; si no viene, falla con un mensaje claro (no publica con token de usuario). */
export function tokenDePagina(json: Record<string, unknown>): string {
  const t = json.access_token;
  if (typeof t !== "string" || !t) throw new Error(`Meta no devolvió access_token de página: ${JSON.stringify(json).slice(0, 200)}`);
  return t;
}
