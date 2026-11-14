import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runRedes, issueRedesDelDia } from "./run";
import { redesConfig } from "./lib/api";
import { laminasYArticuloListos } from "./lib/espera";
import { parsePost } from "@/blog/lib/schema";
import { postPath } from "@/blog/lib/registry";
const historialLibre = { yaPublicadoEnRed: async () => false, registrar: async () => {} };

const SITE = "https://travelpuzzle.com.mx";
const post = (() => { const r = parsePost(JSON.parse(readFileSync("docs/blog/ejemplos/2026-11-07-eu-01-requisitos-entrar-europa.json", "utf8"))); if (!r.ok) throw new Error(r.error); return r.post; })();
const all = { SOCIAL_LINKEDIN_ENABLED: "true", SOCIAL_FACEBOOK_ENABLED: "true", SOCIAL_INSTAGRAM_ENABLED: "true" };
const secrets = { META_PAGE_ID: "1", META_PAGE_TOKEN: "t", META_IG_USER_ID: "2", LINKEDIN_ORG_ID: "3", LINKEDIN_TOKEN: "l" };
const res = (status: number, body: unknown) => ({ ok: status < 400, status, text: async () => JSON.stringify(body), headers: { get: () => "urn:li:share:9" } });

describe("redes del día", () => {
  it("REQ-1081: sin banderas ni tokens no llama a ninguna API: las 3 redes quedan «manual» con sus textos", async () => {
    const calls: string[] = [];
    const r = await runRedes({ historial: historialLibre, post, siteUrl: SITE, config: redesConfig({}, {}), fetch: async (u) => { calls.push(u); return res(200, {}); } });
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

  // REQ-1513 (reemplaza REQ-1501): Facebook ya no lee el feed de la página; el registro (REQ-1090) es la única revisión.
  it("REQ-1513: Facebook publica con el registro como única revisión y no lee el feed", async () => {
    const lecturas: string[] = [];
    const registradas: string[] = [];
    const r = await runRedes({ post, siteUrl: SITE, config: redesConfig({ SOCIAL_FACEBOOK_ENABLED: "true" }, secrets), wait: async () => {},
      historial: { yaPublicadoEnRed: async () => false, registrar: async (red) => { registradas.push(red); } },
      fetch: async (u) => {
        if (u.includes("fields=access_token")) return res(200, { access_token: "PAGE-TOK", id: "1" });
        if (u.includes("fields=message")) lecturas.push(u);
        return res(200, { id: "fb4" });
      },
    });
    expect(lecturas).toEqual([]);
    expect(r.resultados.find((x) => x.red === "facebook")?.estado).toBe("publicado");
    expect(registradas).toEqual(["facebook"]);
  });

  it("REQ-1513: si el registro no se puede leer, Facebook no publica y lo reporta", async () => {
    const llamadas: string[] = [];
    const r = await runRedes({ post, siteUrl: SITE, config: redesConfig({ SOCIAL_FACEBOOK_ENABLED: "true" }, secrets), wait: async () => {},
      historial: { yaPublicadoEnRed: async () => { throw new Error("D1 caído"); }, registrar: async () => {} },
      fetch: async (u) => { llamadas.push(u); return res(200, { access_token: "PAGE-TOK", id: "1" }); },
    });
    const fb = r.resultados.find((x) => x.red === "facebook");
    expect(fb?.estado).toBe("fallo");
    expect(fb?.detalle).toMatch(/no se pudo leer el registro/);
    expect(llamadas.some((u) => u.includes("/feed"))).toBe(false);
  });

  // REQ-1503: Instagram no repite una entrada que ya está en la cuenta (la caption abre con el título de la entrada).
  it("REQ-1503: Instagram no publica otra vez una entrada que ya está en la cuenta", async () => {
    const creados: string[] = [];
    const r = await runRedes({ historial: historialLibre,
      post, siteUrl: SITE, config: redesConfig({ SOCIAL_INSTAGRAM_ENABLED: "true" }, secrets), wait: async () => {},
      fetch: async (u, init) => {
        if (u.includes("fields=caption")) return res(200, { data: [{ id: "18137494546655917", caption: `${post.title}\n\nresumen` }] });
        if (init?.method === "POST") creados.push(u);
        return res(200, {});
      },
    });
    expect(creados).toEqual([]);
    const ig = r.resultados.find((x) => x.red === "instagram");
    expect(ig?.estado).toBe("publicado");
    expect(ig?.detalle).toMatch(/ya estaba publicado.*18137494546655917/);
  });

  it("REQ-1503: si Instagram no deja revisar la cuenta, no publica y lo reporta", async () => {
    const creados: string[] = [];
    const r = await runRedes({ historial: historialLibre,
      post, siteUrl: SITE, config: redesConfig({ SOCIAL_INSTAGRAM_ENABLED: "true" }, secrets), wait: async () => {},
      fetch: async (u, init) => {
        if (u.includes("fields=caption")) return res(403, { error: { message: "permiso" } });
        if (init?.method === "POST") creados.push(u);
        return res(200, {});
      },
    });
    expect(creados).toEqual([]);
    const ig = r.resultados.find((x) => x.red === "instagram");
    expect(ig?.estado).toBe("fallo");
    expect(ig?.detalle).toMatch(/no publico para no duplicar/);
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
    const r = await runRedes({ historial: historialLibre, post, siteUrl: SITE, config: redesConfig({ SOCIAL_INSTAGRAM_ENABLED: "true" }, secrets), wait: async () => {}, fetch: async (_u, init) => (init?.method === "HEAD" ? res(404, {}) : res(200, { id: "x" })) });
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

  // REQ-1609: ninguna red publica hasta que el artículo y las láminas respondan 200.
  it("REQ-1609: si una lámina aún no responde 200, ninguna red publica y el motivo dice qué falta", async () => {
    const posts: string[] = [];
    const r = await runRedes({ post, siteUrl: SITE, config: redesConfig(all, secrets), wait: async () => {},
      historial: { yaPublicadoEnRed: async () => false, registrar: async () => {} },
      fetch: async (u, init) => {
        if (init?.method === "HEAD") return res(u.endsWith("/ig-2.jpg") ? 404 : 200, {});
        posts.push(u);
        return res(200, { id: "x", access_token: "PAGE-TOK" });
      },
    });
    expect(posts).toEqual([]);
    expect(r.resultados.filter((x) => x.estado === "fallo").map((x) => x.red)).toEqual(["linkedin", "facebook", "instagram"]);
    expect(r.resultados.every((x) => x.detalle.includes("ig-2.jpg"))).toBe(true);
  });
});

// REQ-10520 (INC-016): las redes esperan, con reintentos, a que el artículo y las láminas respondan 200.
describe("REQ-10520: esperar la publicación antes de publicar en redes", () => {
  const fbOnly = () => redesConfig({ SOCIAL_FACEBOOK_ENABLED: "true" }, secrets);
  const ok = (u: string) => (u.includes("fields=access_token") ? res(200, { access_token: "PAGE-TOK", id: "1" }) : res(200, { id: "fb1" }));

  it("REQ-10520: si el artículo aún da 404 y luego 200, espera y publica (caso 13 nov: deploy de 19:24 a 19:47)", async () => {
    let comprobaciones = 0;
    const pausas: number[] = [];
    const r = await runRedes({
      post, siteUrl: SITE, config: fbOnly(), historial: historialLibre,
      espera: { intentos: 5, pausaMs: 60_000 },
      wait: async (ms) => { pausas.push(ms); },
      fetch: async (u, init) => {
        if (init?.method === "HEAD") { if (u.endsWith(postPath(post))) comprobaciones++; return res(comprobaciones <= 2 ? 404 : 200, {}); }
        return ok(u);
      },
    });
    expect(r.resultados.find((x) => x.red === "facebook")?.estado).toBe("publicado");
    expect(comprobaciones).toBe(3);
    expect(pausas.slice(0, 2)).toEqual([60_000, 60_000]);
  });

  it("REQ-10520: si nunca responde 200, se rinde tras los intentos y nada se publica", async () => {
    let comprobaciones = 0;
    const posts: string[] = [];
    const r = await runRedes({
      post, siteUrl: SITE, config: fbOnly(), historial: historialLibre,
      espera: { intentos: 4, pausaMs: 1 }, wait: async () => {},
      fetch: async (u, init) => {
        if (init?.method === "HEAD") { if (u.endsWith(postPath(post))) comprobaciones++; return res(404, {}); }
        posts.push(u); return ok(u);
      },
    });
    expect(comprobaciones).toBe(4);
    expect(posts).toEqual([]);
    expect(r.resultados.find((x) => x.red === "facebook")).toMatchObject({ estado: "fallo" });
    expect(r.resultados.find((x) => x.red === "facebook")?.detalle).toMatch(/esperando/);
  });

  it("REQ-10520: por omisión espera hasta 60 min (60 intentos de 60 s) y el workflow da tiempo para eso", async () => {
    const { ESPERA_PUBLICACION } = await import("./run");
    expect(ESPERA_PUBLICACION).toEqual({ intentos: 60, pausaMs: 60_000 });
    const wf = readFileSync(".github/workflows/redes-diario.yml", "utf8");
    const t = Number(wf.match(/timeout-minutes:\s*(\d+)/)?.[1]);
    expect(t).toBeGreaterThanOrEqual(75);
  });
});
