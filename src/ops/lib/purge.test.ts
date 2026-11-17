import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { authHeaders, CF_API, PURGE_URL_LOTE, purgeEverythingRequest, purgeOutcome, purgeUrlsRequests, zoneIdFromLookup, zoneLookupUrl } from "./purge";

describe("REQ-3320: purga de la caché del borde (piezas puras)", () => {
  it("REQ-3320: la purga total pega a purge_cache de la zona con purge_everything", () => {
    const r = purgeEverythingRequest("zona123");
    expect(r.url).toBe(`${CF_API}/zones/zona123/purge_cache`);
    expect(r.method).toBe("POST");
    expect(JSON.parse(r.body)).toEqual({ purge_everything: true });
  });

  it("REQ-3320: la purga por URL quita repetidas, descarta lo que no es del sitio y parte en lotes de 30", () => {
    const urls = Array.from({ length: 35 }, (_, i) => `https://travelpuzzle.com.mx/viajes/x/${i}`);
    const lotes = purgeUrlsRequests("z", [...urls, urls[0], "https://otro.sitio/evil", "javascript:alert(1)", "/relativa"], "travelpuzzle.com.mx");
    expect(lotes).toHaveLength(2);
    const cuerpos = lotes.map((l) => JSON.parse(l.body) as { files: string[] });
    expect(cuerpos[0].files).toHaveLength(PURGE_URL_LOTE);
    expect(cuerpos[1].files).toHaveLength(5);
    expect(cuerpos.flatMap((c) => c.files)).not.toContain("https://otro.sitio/evil");
    for (const l of lotes) expect(l.url).toBe(`${CF_API}/zones/z/purge_cache`);
  });

  it("REQ-3320: sin URL válidas no arma ninguna petición", () => {
    expect(purgeUrlsRequests("z", ["https://otro.sitio/"], "travelpuzzle.com.mx")).toEqual([]);
  });

  it("REQ-3320: la zona se busca por nombre y se lee del primer resultado", () => {
    expect(zoneLookupUrl("travelpuzzle.com.mx")).toBe(`${CF_API}/zones?name=travelpuzzle.com.mx&status=active`);
    expect(zoneIdFromLookup({ success: true, result: [{ id: "abc", name: "travelpuzzle.com.mx" }] })).toBe("abc");
    expect(zoneIdFromLookup({ success: true, result: [] })).toBeNull();
    expect(zoneIdFromLookup({ success: false, errors: [{ code: 9109, message: "sin permiso" }] })).toBeNull();
    expect(zoneIdFromLookup("basura")).toBeNull();
  });

  it("REQ-3320: el veredicto de la API distingue éxito, token sin permiso y error", () => {
    expect(purgeOutcome(200, { success: true, result: { id: "x" } })).toEqual({ ok: true, motivo: "purgada" });
    expect(purgeOutcome(403, { success: false, errors: [{ code: 10000, message: "Authentication error" }] })).toMatchObject({ ok: false });
    expect(purgeOutcome(403, { success: false, errors: [{ code: 10000, message: "Authentication error" }] }).motivo).toMatch(/10000.*Authentication error/);
    expect(purgeOutcome(500, null).motivo).toMatch(/500/);
  });

  it("REQ-3320: los encabezados llevan el token como Bearer y el token nunca sale en el veredicto", () => {
    const h = authHeaders("tok-secreto");
    expect(h.authorization).toBe("Bearer tok-secreto");
    expect(h["content-type"]).toBe("application/json");
    expect(JSON.stringify(purgeOutcome(403, { success: false, errors: [{ code: 1, message: "x tok-secreto" }] }, "tok-secreto"))).not.toContain("tok-secreto");
  });
});

describe("REQ-3320: paso de purga en el workflow de deploy", () => {
  type Step = { name?: string; id?: string; if?: string; run?: string; env?: Record<string, string>; "continue-on-error"?: boolean };
  const wf = parse(readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8")) as { jobs: { deploy: { steps: Step[] } } };
  const steps = wf.jobs.deploy.steps;
  const nombres = steps.map((s) => s.name);
  const purga = steps.find((s) => s.name === "Purgar la caché del borde (REQ-3320)");

  it("REQ-3320: existe, corre solo si se publicó y no tumba el deploy", () => {
    expect(purga, "falta el paso de purga").toBeDefined();
    expect(purga!.if).toMatch(/always\(\) && steps\.publicar\.outcome == 'success'/);
    expect(purga!["continue-on-error"]).toBe(true);
    expect(purga!.run).toMatch(/purgar-cache\.ts todo/);
  });

  it("REQ-3320: usa el token solo de purga (no el de deploy) y va entre Publicar y Calentar la caché", () => {
    expect(purga!.env?.CLOUDFLARE_PURGE_TOKEN).toBe("${{ secrets.CLOUDFLARE_PURGE_TOKEN }}");
    expect(purga!.env?.CLOUDFLARE_API_TOKEN).toBeUndefined();
    const i = nombres.indexOf("Purgar la caché del borde (REQ-3320)");
    expect(i).toBeGreaterThan(nombres.indexOf("Publicar"));
    expect(i).toBeLessThan(nombres.indexOf("Calentar la caché de producción (INC-009)"));
    expect(i).toBeLessThan(nombres.indexOf("Prueba de humo (producción)"));
  });
});
