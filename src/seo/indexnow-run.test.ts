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

// REQ-626 reemplaza la parte «la clave no vive en el repo» de REQ-586: el PO pidió cargarla («hazlo tú», 6 nov 2026 22:37).
const APPROVED_KEY = "08fccf385745e822f4ea759d05a50ad6";

describe("REQ-626: INDEXNOW_KEY es la clave aprobada, como variable no secreta", () => {
  it("REQ-626: wrangler.jsonc trae exactamente la clave aprobada, una sola vez y con formato de IndexNow", () => {
    const raw = readFileSync("wrangler.jsonc", "utf8");
    expect(raw.match(/"INDEXNOW_KEY"\s*:/g)).toHaveLength(1);
    expect(wranglerVars(raw).INDEXNOW_KEY).toBe(APPROVED_KEY);
    expect(APPROVED_KEY).toMatch(/^[A-Za-z0-9-]{8,128}$/);
  });
  it("REQ-627: INDEXNOW_ENABLED en \"true\" y la clave publicada es la aprobada", async () => {
    const vars = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
    expect(vars.INDEXNOW_ENABLED).toBe("true");
    const res = keyFileResponse({ INDEXNOW_ENABLED: vars.INDEXNOW_ENABLED, INDEXNOW_KEY: vars.INDEXNOW_KEY });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(APPROVED_KEY);
  });
});
