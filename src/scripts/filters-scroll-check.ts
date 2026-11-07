/**
 * REQ-530 — prueba con navegador real (Playwright) de la columna de filtros de /tours.
 * Uso: npx tsx src/scripts/filters-scroll-check.ts <url-base> [prefijo-capturas]   → sale con 1 si falla.
 * 1366 px: la columna es sticky bajo el header, cabe en la ventana, tiene overflow-y propio y la rueda sobre ella
 *          la recorre hasta el final sin mover la página. 390 px: la columna no se ve y el botón abre la hoja
 *          a pantalla completa (REQ-056, sin regresión).
 */
import { chromium } from "playwright";
const [rawBase, prefix = "filtros"] = process.argv.slice(2);
const base = (rawBase ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Uso: npx tsx src/scripts/filters-scroll-check.ts <url-base> [prefijo]"); process.exit(2); }
async function main() {
  const b = await chromium.launch();
  let ok = true;
  for (const w of [1366, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 768 }, locale: "es-MX" });
    await ctx.addCookies([{ name: "preferredLanguage", value: "es", url: base }]);
    const p = await ctx.newPage(); const errs: string[] = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(base + "/tours", { waitUntil: "domcontentloaded", timeout: 240000 }); await p.waitForTimeout(7000);
    if (w === 1366) {
      const sel = 'aside > div[class*="lg:sticky"]';
      await p.screenshot({ path: `${prefix}-1366-antes.png` });
      await p.mouse.wheel(0, 1500); await p.waitForTimeout(800);
      const m = await p.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, scrollH: el.scrollHeight, clientH: el.clientHeight, pageY: Math.round(scrollY), overflowY: getComputedStyle(el).overflowY, position: getComputedStyle(el).position }; });
      // la rueda sobre la columna mueve la columna, no la página
      const box = await p.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 200 }; });
      await p.mouse.move(box.x, box.y); const y0 = await p.evaluate(() => scrollY);
      await p.mouse.wheel(0, 2000); await p.waitForTimeout(800);
      const after = await p.$eval(sel, (el) => ({ scrollTop: Math.round(el.scrollTop), max: el.scrollHeight - el.clientHeight }));
      const y1 = await p.evaluate(() => scrollY);
      await p.screenshot({ path: `${prefix}-1366-despues.png` });
      const pass = m.position === "sticky" && m.overflowY === "auto" && m.top >= 64 && m.bottom <= m.vh && after.scrollTop > 0 && after.scrollTop >= after.max - 2 && y1 === y0;
      console.log("1366", JSON.stringify({ ...m, ...after, pageYAntes: y0, pageYDespues: y1 }), pass ? "OK" : "FALLA", "errores:", errs.length);
      ok &&= pass;
    } else {
      // celular: la columna no se ve; el botón abre la hoja a pantalla completa con su propio scroll (REQ-056, sin regresión)
      const hiddenBefore = await p.$eval('aside > div[class*="lg:sticky"]', (el) => getComputedStyle(el).display === "none");
      await p.getByRole("button", { name: /filtros/i }).first().click(); await p.waitForTimeout(800);
      const sheet = await p.$eval('[role="dialog"]', (el) => { const r = el.getBoundingClientRect(); return { position: getComputedStyle(el).position, h: Math.round(r.height), w: Math.round(r.width) }; });
      await p.screenshot({ path: `${prefix}-390-hoja.png` });
      const pass = hiddenBefore && sheet.position === "fixed" && sheet.h >= 800 && sheet.w === 390;
      console.log("390", JSON.stringify({ hiddenBefore, ...sheet }), pass ? "OK" : "FALLA", "errores:", errs.length);
      ok &&= pass;
    }
    await ctx.close();
  }
  await b.close();
  console.log(ok ? "REQ-530 OK" : "REQ-530 FALLA"); process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
