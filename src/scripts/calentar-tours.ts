/**
 * REQ-10842 (INC-027): calentado de producción que exige viajes. Uso: `npx tsx src/scripts/calentar-tours.ts <base>`.
 * Pide /tours y /en/tours con UA de bot hasta que traigan ≥ 2 fichas de viaje distintas (6 intentos × 15 s).
 * Sale con 0 si las dos quedaron listas; con 1 si alguna no (el paso del workflow sigue con continue-on-error y
 * el humo de producción decide, como antes). Nunca publica ni regresa nada: solo lee.
 */
import { enlacesViajes, planCalentado } from "../ops/lib/tours-listos";

const base = (process.argv[2] ?? "https://travelpuzzle.com.mx").replace(/\/$/, "");
const UA = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
const plan = planCalentado();

async function leer(url: string): Promise<{ status: number; html: string; ms: number }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
    return { status: r.status, html: r.status === 200 ? await r.text() : "", ms: Date.now() - t0 };
  } catch (e) {
    console.log(`calentar ${url}: sin respuesta (${(e as Error).message})`);
    return { status: 0, html: "", ms: Date.now() - t0 };
  }
}

(async () => {
  let listas = 0;
  for (const ruta of plan.rutas) {
    for (let intento = 1; intento <= plan.intentos; intento++) {
      const r = await leer(`${base}${ruta}`);
      const n = enlacesViajes(r.html).length;
      console.log(`calentar ${ruta} intento ${intento}: ${r.status} en ${(r.ms / 1000).toFixed(1)} s, ${n} fichas de viaje`);
      if (n >= plan.minimo) { listas++; break; }
      if (intento < plan.intentos) await new Promise((res) => setTimeout(res, plan.esperaMs));
    }
  }
  if (listas < plan.rutas.length) {
    console.log(`REQ-10842: ${plan.rutas.length - listas} ruta(s) sin ${plan.minimo} fichas tras ${plan.intentos} intentos; el humo de producción decide.`);
    process.exit(1);
  }
  console.log("REQ-10842: /tours y /en/tours traen viajes; listo para el humo de producción.");
})();
