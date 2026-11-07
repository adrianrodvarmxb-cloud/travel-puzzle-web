import { describe, expect, it, vi } from "vitest";
import { runIndexNow, keyFileResponse } from "./indexnow-run";

const site = "https://travelpuzzle.com.mx";
const KEY = "a1b2c3d4e5f6a7b8";
const files = async () => ({ "sitemap-viajes.xml": `<urlset><url><loc>${site}/viajes/x/y</loc><lastmod>2026-11-05</lastmod></url><url><loc>${site}/viajes/x/z</loc><lastmod>2026-11-01</lastmod></url></urlset>` });

describe("REQ-586: corrida diaria de IndexNow", () => {
  it("REQ-586: apagada no lee sitemaps ni envía nada", async () => {
    const f = vi.fn(); const getFiles = vi.fn(files);
    expect(await runIndexNow({ env: { INDEXNOW_ENABLED: "false", INDEXNOW_KEY: KEY }, siteUrl: site, now: new Date("2026-11-06T12:00:00Z"), getFiles, fetch: f })).toEqual({ skipped: "indexnow_disabled" });
    expect(getFiles).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });
  it("REQ-586: encendida manda solo lo que cambió desde ayer", async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const r = await runIndexNow({ env: { INDEXNOW_ENABLED: "true", INDEXNOW_KEY: KEY }, siteUrl: site, now: new Date("2026-11-06T12:00:00Z"), getFiles: files, fetch: f });
    expect(r).toEqual({ sent: 1, status: 200 });
    expect(JSON.parse(f.mock.calls[0][1].body).urlList).toEqual([`${site}/viajes/x/y`]);
  });
  it("REQ-586: /indexnow-key.txt responde la clave solo encendida", async () => {
    expect(keyFileResponse({ INDEXNOW_ENABLED: "false", INDEXNOW_KEY: KEY }).status).toBe(404);
    const on = keyFileResponse({ INDEXNOW_ENABLED: "true", INDEXNOW_KEY: KEY });
    expect(on.status).toBe(200);
    expect(await on.text()).toBe(KEY);
    expect(on.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });
});

import { readFileSync } from "node:fs";
import { wranglerVars } from "@/site/lib/pages";

describe("REQ-586: la bandera queda apagada y la clave no vive en el repo", () => {
  it("REQ-586: wrangler.jsonc trae INDEXNOW_ENABLED=\"false\" y ninguna INDEXNOW_KEY", () => {
    const raw = readFileSync("wrangler.jsonc", "utf8");
    expect(wranglerVars(raw).INDEXNOW_ENABLED).toBe("false");
    expect(raw).not.toMatch(/"INDEXNOW_KEY"\s*:/);
  });
});
