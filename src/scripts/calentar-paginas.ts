/**
 * REQ-10868 (INC-028, corrección A): calienta en producción todas las páginas fijas del humo más las guías del día antes
 * de la prueba de humo. Uso: `npx tsx src/scripts/calentar-paginas.ts <base> [AAAA-MM-DD]`. Solo lee; registra el código y
 * el tiempo de cada intento. Nunca tumba el deploy: el humo de producción decide (sale siempre con 0).
 */
import { readFileSync } from "node:fs";
import { CALENTADO, guiasDelDia, paginasACalentar, type GuiaPublicada } from "../ops/lib/calentado";

const base = (process.argv[2] ?? "https://travelpuzzle.com.mx").replace(/\/$/, "");
// «Hoy» en la hora de México: las guías del día llevan la fecha CDMX con la que las publica «Guías de ciudad».
const hoy = process.argv[3] ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const UA = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";

const fijas = (JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")) as { fixed: string[] }).fixed;
const guias = JSON.parse(readFileSync("src/destinations/content/guias.json", "utf8")) as GuiaPublicada[];
const paginas = paginasACalentar(fijas, guiasDelDia(guias, hoy));

async function pedir(url: string): Promise<{ status: number; ms: number }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(CALENTADO.timeoutMs), redirect: "manual" });
    await r.arrayBuffer().catch(() => null);
    return { status: r.status, ms: Date.now() - t0 };
  } catch (e) {
    console.log(`calentar ${url}: sin respuesta (${(e as Error).message})`);
    return { status: 0, ms: Date.now() - t0 };
  }
}

(async () => {
  console.log(`REQ-10868: calentando ${paginas.length} páginas (${fijas.length} fijas + guías del ${hoy})`);
  let frias = 0;
  for (const p of paginas) {
    for (let intento = 1; intento <= CALENTADO.intentos; intento++) {
      const r = await pedir(`${base}${p}`);
      console.log(`calentar ${p} intento ${intento}: ${r.status} en ${(r.ms / 1000).toFixed(1)} s`);
      if (r.status >= 200 && r.status < 400) break;
      if (intento === CALENTADO.intentos) frias++;
      else await new Promise((res) => setTimeout(res, CALENTADO.esperaMs));
    }
  }
  console.log(frias ? `REQ-10868: ${frias} página(s) sin 2xx/3xx tras ${CALENTADO.intentos} intentos; el humo de producción decide.` : "REQ-10868: todas las páginas respondieron; listo para el humo de producción.");
})();
