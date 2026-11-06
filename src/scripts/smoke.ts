/**
 * REQ-003 — Prueba de humo con navegador real (Playwright) a 390 y 1366 px.
 * Uso: npx tsx src/scripts/smoke.ts <url-base>   → sale con código 1 si algo falla.
 * Páginas: tests/smoke/pages.json + fichas reales encontradas en /tours.
 * REQ-242: las de "flagged" entran solo si su bandera está en "true" (en el entorno del runner o en wrangler.jsonc).
 */
import { readFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { isHydrationError, smokePages, smokeVerdict, type SmokeResult } from "../ops/lib/smoke";
import { flaggedSmokePages, wranglerVars } from "../site/lib/pages";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Uso: npx tsx src/scripts/smoke.ts <url-base>"); process.exit(2); }
const cfg = JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")) as { fixed: string[]; flagged?: Record<string, string[]> };
const fixed = [...cfg.fixed, ...flaggedSmokePages(cfg.flagged, wranglerVars(readFileSync("wrangler.jsonc", "utf8")), process.env)];

(async () => {
  const browser = await chromium.launch();
  const discover = await browser.newPage();
  await discover.goto(`${base}/tours`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => null);
  const links = await discover.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href") ?? "")).catch(() => [] as string[]);
  await discover.close();
  const pages = smokePages(fixed, links);

  const results: SmokeResult[] = [];
  for (const [viewport, opts] of [[390, { ...devices["Pixel 7"] }], [1366, { viewport: { width: 1366, height: 900 } }]] as const) {
    const ctx = await browser.newContext({ ...opts, locale: "es-MX" });
    // INC-001: el navegador del cliente puede traducir países distinto que el servidor.
    // Se altera Intl.DisplayNames en el navegador: si algún componente lo usa al hidratar, aparece el error.
    await ctx.addInitScript({ content: `(() => { const O = Intl.DisplayNames; const P = function (l, o) { const d = new O(l, o); return { of: (c) => { const v = d.of(c); return v ? v + "\\u200b" : v; }, resolvedOptions: () => d.resolvedOptions() }; }; Object.defineProperty(Intl, "DisplayNames", { value: P }); })();` });
    for (const path of pages) {
      const page = await ctx.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      // En producción React reporta la hidratación fallida por consola (#418/#423/#425), no como excepción.
      page.on("console", (m) => { if (m.type() === "error" && isHydrationError(m.text())) pageErrors.push(m.text()); });
      const res = await page.goto(`${base}${path}${path.includes("?") ? "&" : "?"}smoke=${Date.now()}`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => null);
      await page.waitForTimeout(1500);
      const appError = await page.evaluate(() => document.body?.innerText.includes("Application error") ?? false).catch(() => false);
      results.push({ path, viewport, status: res?.status() ?? null, pageErrors, appError });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();

  for (const r of results) console.log(`${r.status ?? "---"} @${r.viewport} ${r.path}${r.appError || r.pageErrors.length ? "  ✗" : "  ✓"}`);
  const v = smokeVerdict(results);
  if (!v.ok) { console.error(`\nPRUEBA DE HUMO FALLIDA (${v.failures.length}):\n- ${v.failures.join("\n- ")}`); process.exit(1); }
  console.log(`\nPrueba de humo OK: ${results.length} cargas sin errores.`);
})();
