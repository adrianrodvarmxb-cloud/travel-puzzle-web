import { describe, expect, it, vi } from "vitest";
import { changedUrls, indexNowConfig, indexNowRequest, submitIndexNow } from "./indexnow";

const site = "https://travelpuzzle.com.mx";
const KEY = "a1b2c3d4e5f6a7b8";

describe("REQ-586: IndexNow tras INDEXNOW_ENABLED (apagada)", () => {
  it("REQ-586: solo «true» exacto y con clave válida lo enciende", () => {
    expect(indexNowConfig({ INDEXNOW_ENABLED: "false", INDEXNOW_KEY: KEY })).toBeNull();
    expect(indexNowConfig({ INDEXNOW_ENABLED: "true" })).toBeNull();
    expect(indexNowConfig({ INDEXNOW_ENABLED: "true", INDEXNOW_KEY: "corta" })).toBeNull();
    expect(indexNowConfig({ INDEXNOW_ENABLED: "true", INDEXNOW_KEY: "con espacio 12345" })).toBeNull();
    expect(indexNowConfig({ INDEXNOW_ENABLED: "TRUE", INDEXNOW_KEY: KEY })).toBeNull();
    expect(indexNowConfig({ INDEXNOW_ENABLED: "true", INDEXNOW_KEY: KEY })).toEqual({ key: KEY });
  });
  it("REQ-586: URLs con lastmod de ayer u hoy, desde los sitemaps", () => {
    const files = {
      "sitemap-destinos.xml": `<urlset><url><loc>${site}/destinos/mx</loc><lastmod>2026-11-06</lastmod></url><url><loc>${site}/destinos/pe</loc><lastmod>2026-10-01</lastmod></url></urlset>`,
      "sitemap-tours-mx.xml": `<urlset><url><loc>${site}/destinos/mx/cdmx/a</loc><lastmod>2026-11-05</lastmod></url><url><loc>${site}/destinos/mx/cdmx/b</loc></url></urlset>`,
    };
    expect(changedUrls(files, "2026-11-05")).toEqual([`${site}/destinos/mx`, `${site}/destinos/mx/cdmx/a`]);
  });
  it("REQ-586: el cuerpo lleva host, key y keyLocation; solo el propio dominio, sin repetir, máx. 10,000", () => {
    const r = indexNowRequest({ siteUrl: `${site}/`, key: KEY, urls: [`${site}/a`, `${site}/a`, "https://otro.com/x", `${site}/b`] });
    expect(r).toEqual({ endpoint: "https://api.indexnow.org/indexnow", body: { host: "travelpuzzle.com.mx", key: KEY, keyLocation: `${site}/indexnow-key.txt`, urlList: [`${site}/a`, `${site}/b`] } });
    expect(indexNowRequest({ siteUrl: site, key: KEY, urls: [] })).toBeNull();
    const many = Array.from({ length: 10_050 }, (_, i) => `${site}/t/${i}`);
    expect(indexNowRequest({ siteUrl: site, key: KEY, urls: many })!.body.urlList).toHaveLength(10_000);
  });
  it("REQ-586: el envío usa el fetch inyectado y un error no lanza", async () => {
    const ok = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    expect(await submitIndexNow({ siteUrl: site, key: KEY, urls: [`${site}/a`] }, ok)).toEqual({ sent: 1, status: 202 });
    expect(ok).toHaveBeenCalledWith("https://api.indexnow.org/indexnow", expect.objectContaining({ method: "POST", headers: { "content-type": "application/json; charset=utf-8" } }));
    const boom = vi.fn().mockRejectedValue(new Error("red caída"));
    expect(await submitIndexNow({ siteUrl: site, key: KEY, urls: [`${site}/a`] }, boom)).toEqual({ sent: 0, status: null, error: "red caída" });
    expect(await submitIndexNow({ siteUrl: site, key: KEY, urls: [] }, ok)).toEqual({ sent: 0, status: null });
  });
});
