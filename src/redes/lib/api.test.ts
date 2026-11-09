import { describe, expect, it } from "vitest";
import { facebookPostRequest, paginaTokenUrl, tokenDePagina, instagramChildRequest, instagramCarouselRequest, instagramSingleRequest, instagramPublishRequest, linkedinPostRequest, littleText, socialFlags, redesConfig, GRAPH_VERSION_DEFAULT, LINKEDIN_VERSION_DEFAULT } from "./api";

describe("llamadas a las API de redes (sin tokens en el código)", () => {
  it("REQ-1076: cada red tras su bandera en \"false\" y con sus secretos; sin token, manual", () => {
    expect(socialFlags({})).toEqual({ linkedin: false, facebook: false, instagram: false });
    expect(socialFlags({ SOCIAL_FACEBOOK_ENABLED: "true" })).toEqual({ linkedin: false, facebook: true, instagram: false });
    const cfg = redesConfig({ SOCIAL_FACEBOOK_ENABLED: "true", SOCIAL_INSTAGRAM_ENABLED: "true" }, { META_PAGE_ID: "1", META_PAGE_TOKEN: "t" });
    expect(cfg.facebook).toEqual({ mode: "auto", pageId: "1", token: "t", graph: GRAPH_VERSION_DEFAULT });
    expect(cfg.instagram).toEqual({ mode: "manual", motivo: "faltan secretos: META_IG_USER_ID" });
    expect(cfg.linkedin).toEqual({ mode: "manual", motivo: "SOCIAL_LINKEDIN_ENABLED apagada" });
  });

  it("REQ-1077: Facebook — POST /{page-id}/feed con message y link", () => {
    expect(facebookPostRequest({ pageId: "123", token: "tok", graph: "v23.0" }, "Hola", "https://t.mx/a?utm_source=facebook")).toEqual({
      url: "https://graph.facebook.com/v23.0/123/feed", method: "POST",
      form: { message: "Hola", link: "https://t.mx/a?utm_source=facebook", access_token: "tok" },
    });
  });

  it("REQ-1078: Instagram — contenedor por lámina, carrusel con caption y media_publish", () => {
    const c = { igUserId: "99", token: "tok", graph: "v23.0" };
    expect(instagramChildRequest(c, "https://t.mx/ig-1.jpg")).toEqual({ url: "https://graph.facebook.com/v23.0/99/media", method: "POST", form: { image_url: "https://t.mx/ig-1.jpg", is_carousel_item: "true", access_token: "tok" } });
    expect(instagramCarouselRequest(c, ["a", "b", "c"], "Caption")).toEqual({ url: "https://graph.facebook.com/v23.0/99/media", method: "POST", form: { media_type: "CAROUSEL", children: "a,b,c", caption: "Caption", access_token: "tok" } });
    expect(instagramSingleRequest(c, "https://t.mx/ig-1.jpg", "Caption").form).toEqual({ image_url: "https://t.mx/ig-1.jpg", caption: "Caption", access_token: "tok" });
    expect(instagramPublishRequest(c, "777")).toEqual({ url: "https://graph.facebook.com/v23.0/99/media_publish", method: "POST", form: { creation_id: "777", access_token: "tok" } });
  });

  it("REQ-1079: LinkedIn — POST /rest/posts como organización, con versión y artículo", () => {
    const r = linkedinPostRequest({ orgId: "555", token: "tok", version: LINKEDIN_VERSION_DEFAULT }, "Texto #Viajes (90 días)", { url: "https://t.mx/a", title: "Título", description: "Resumen" });
    expect(r.url).toBe("https://api.linkedin.com/rest/posts");
    expect(r.headers).toEqual({ Authorization: "Bearer tok", "LinkedIn-Version": LINKEDIN_VERSION_DEFAULT, "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json" });
    expect(r.json).toMatchObject({ author: "urn:li:organization:555", visibility: "PUBLIC", lifecycleState: "PUBLISHED", content: { article: { source: "https://t.mx/a", title: "Título", description: "Resumen" } } });
    expect(r.json.commentary).toBe("Texto {hashtag|\\#|Viajes} \\(90 días\\)");
  });

  it("REQ-1079: «little text» de LinkedIn escapa los reservados y convierte hashtags", () => {
    expect(littleText("a_b *c* [d] <e> @f ~g | {h}")).toBe("a\\_b \\*c\\* \\[d\\] \\<e\\> \\@f \\~g \\| \\{h\\}");
    expect(littleText("#TravelPuzzle y #Viajes")).toBe("{hashtag|\\#|TravelPuzzle} y {hashtag|\\#|Viajes}");
  });
});

describe("REQ-1085: token de página para Facebook", () => {
  it("REQ-1085: pide el access_token de la página con el token de usuario de sistema", () => {
    expect(paginaTokenUrl({ graph: "v23.0", pageId: "115393804914232", token: "sys" })).toBe(
      "https://graph.facebook.com/v23.0/115393804914232?fields=access_token&access_token=sys",
    );
  });

  it("REQ-1085: extrae el token de página de la respuesta; sin token, lanza error claro", () => {
    expect(tokenDePagina({ access_token: "page-tok", id: "1" })).toBe("page-tok");
    expect(() => tokenDePagina({ error: { message: "x" } })).toThrow(/access_token de página/);
  });
});
