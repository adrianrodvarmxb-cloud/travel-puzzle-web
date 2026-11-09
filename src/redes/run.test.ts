import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runRedes, issueRedesDelDia } from "./run";
import { redesConfig } from "./lib/api";
import { parsePost } from "@/blog/lib/schema";
const historialLibre = { yaPublicadoEnRed: async () => false, registrar: async () => {} };

const SITE = "https://travelpuzzle.com.mx";
const post = (() => { const r = parsePost(JSON.parse(readFileSync("docs/blog/ejemplos/2026-11-07-eu-01-requisitos-entrar-europa.json", "utf8"))); if (!r.ok) throw new Error(r.error); return r.post; })();
const all = { SOCIAL_LINKEDIN_ENABLED: "true", SOCIAL_FACEBOOK_ENABLED: "true", SOCIAL_INSTAGRAM_ENABLED: "true" };
const secrets = { META_PAGE_ID: "1", META_PAGE_TOKEN: "t", META_IG_USER_ID: "2", LINKEDIN_ORG_ID: "3", LINKEDIN_TOKEN: "l" };
const res = (status: number, body: unknown) => ({ ok: status < 400, status, text: async () => JSON.stringify(body), headers: { get: () => "urn:li:share:9" } });

describe("redes del día", () => {
  it("REQ-1081: sin banderas ni tokens no llama a ninguna API: las 3 redes quedan «manual» con sus textos", async () => {
    const calls: string[] = [];
    const r = await runRedes({ post, siteUrl: SITE, config: redesConfig({}, {}), fetch: async (u) => { calls.push(u); return res(200, {}); } });
    expect(calls).toEqual([]);
    expect(r.resultados.map((x) => [x.red, x.estado])).toEqual([["linkedin", "manual"], ["facebook", "manual"], ["instagram", "manual"]]);
    expect(r.problemas).toEqual([]);
    const issue = issueRedesDelDia({ ...r, post, url: `${SITE}/blog/europa/${post.slug}` });
    expect(issue).toContain("### LinkedIn (página de empresa)");
    expect(issue).toContain(r.pack.facebook);
    expect(issue).toContain(`${SITE}/blog/img/${post.slug}/ig-1.jpg`);
  });

  it("REQ-1085: Facebook publica con el token de página que devuelve Meta, no con el de usuario de sistema", async () => {
    const usados: string[] = [];
    await runRedes({
      post, siteUrl: SITE, config: redesConfig({ SOCIAL_FACEBOOK_ENABLED: "true" }, secrets), wait: async () => {}, historial: historialLibre,
      fetch: async (u, init) => {
        if (u.includes("fields=access_token")) return res(200, { access_token: "PAGE-TOK", id: "115393804914232" });
        if (u.endsWith("/feed")) { usados.push(String(init?.body)); return res(200, { id: "fb1" }); }
        return res(200, {});
      },
    });
    expect(usados).toHaveLength(1);
    expect(usados[0]).toContain("access_token=PAGE-TOK");
    expect(usados[0]).not.toContain("access_token=t&");
  });

  it("REQ-1080: si una red falla, las demás se publican igual", async () => {
    const r = await runRedes({
      post, siteUrl: SITE, config: redesConfig(all, secrets), wait: async () => {}, historial: historialLibre,
      fetch: async (u, init) => {
        if (u.includes("api.linkedin.com")) return res(401, { message: "token vencido" });
        if (u.includes("fields=access_token")) return res(200, { access_token: "PAGE-TOK", id: "1" });
        if (init?.method === "HEAD") return res(200, {});
        if (u.includes("fields=status_code")) return res(200, { status_code: "FINISHED" });
        if (u.endsWith("/feed")) return res(200, { id: "fb1" });
        if (u.endsWith("/media_publish")) return res(200, { id: "ig9" });
        return res(200, { id: `c${Math.random().toString(36).slice(2, 6)}` });
      },
    });
    expect(r.resultados.map((x) => [x.red, x.estado])).toEqual([["linkedin", "fallo"], ["facebook", "publicado"], ["instagram", "publicado"]]);
    expect(r.resultados[0].detalle).toMatch(/HTTP 401/);
  });

  it("REQ-1078: Instagram no publica si las láminas aún no son públicas", async () => {
    const r = await runRedes({ post, siteUrl: SITE, config: redesConfig({ SOCIAL_INSTAGRAM_ENABLED: "true" }, secrets), wait: async () => {}, fetch: async (_u, init) => (init?.method === "HEAD" ? res(404, {}) : res(200, { id: "x" })) });
    expect(r.resultados.find((x) => x.red === "instagram")).toMatchObject({ estado: "fallo" });
  });
});

describe("REQ-1090: registro y tope en el publicador", () => {
  const fbOnly = (): Parameters<typeof runRedes>[0]["config"] => redesConfig({ SOCIAL_FACEBOOK_ENABLED: "true" }, secrets);
  const ok = async (u: string) => (u.includes("fields=access_token") ? res(200, { access_token: "PAGE-TOK", id: "1" }) : res(200, { id: "fb1" }));

  it("REQ-1090: sin registro no publica (falla cerrada)", async () => {
    const r = await runRedes({ post, siteUrl: SITE, config: fbOnly(), wait: async () => {}, fetch: async (u) => ok(u) });
    expect(r.resultados.find((x) => x.red === "facebook")?.estado).toBe("fallo");
  });

  it("REQ-1090: si el artículo ya salió en la red, no se repite y queda manual", async () => {
    const llamadas: string[] = [];
    const r = await runRedes({
      post, siteUrl: SITE, config: fbOnly(), wait: async () => {},
      historial: { ...historialLibre, yaPublicadoEnRed: async () => true },
      fetch: async (u) => { llamadas.push(u); return ok(u); },
    });
    expect(r.resultados.find((x) => x.red === "facebook")?.estado).toBe("manual");
    expect(llamadas.some((u) => u.endsWith("/feed"))).toBe(false);
  });


  it("REQ-1090: al publicar se registra la red", async () => {
    const registradas: string[] = [];
    await runRedes({
      post, siteUrl: SITE, config: fbOnly(), wait: async () => {},
      historial: { ...historialLibre, registrar: async (red) => { registradas.push(red); } },
      fetch: async (u) => ok(u),
    });
    expect(registradas).toEqual(["facebook"]);
  });
});
