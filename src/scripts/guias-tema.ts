/**
 * REQ-1229: CLI del agente diario para las guías: las 2 ciudades que tocan hoy (primero las 37 con viaje propio, luego por
 * número de experiencias) y los términos que no se pueden repetir.
 *   npx tsx src/scripts/guias-tema.ts
 */
import { guidesForToday, blogTerms } from "../destinations/guias-run";
import { loadGuides } from "../destinations/guias";
import { todayCdmx } from "../blog/diario-run";

(async () => {
  const site = (process.env.SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, "");
  const r = await guidesForToday({ siteUrl: site, fetch: (u) => fetch(u) });
  console.log(JSON.stringify({
    hoy: todayCdmx(new Date()),
    ciudadesDeHoy: r.ciudades.map((k) => ({ clave: k, pagina: `${site}/destinos/${k}` })),
    guiasPublicadas: r.publicadas,
    terminosUsados: [...blogTerms().map((t) => t.term), ...loadGuides().map((g) => g.targetTerm)],
  }, null, 2));
})();
