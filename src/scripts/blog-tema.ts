/**
 * REQ-964, REQ-962, REQ-983: CLI del agente diario. Dice qué toca hoy (pago, free o ninguno), el siguiente ID del
 * calendario y los términos ya usados, para elegir el tema sin canibalizar.
 *   npx tsx src/scripts/blog-tema.ts
 */
import { planForToday, registryPosts } from "../blog/diario-run";
import { CALENDARIO } from "../blog/content/calendario";
import { PILLARS } from "../blog/lib/pillars";
import { FREE_TOUR_POSTS_B1, mixWindow } from "../blog/lib/mix";

const now = new Date();
const plan = planForToday(now);
const posts = registryPosts();
const used = new Set(posts.map((p) => p.tema?.clusterId).filter(Boolean));
console.log(JSON.stringify({
  hoy: plan.today,
  toca: plan.kind,
  motivo: plan.motivo,
  clusterSugerido: plan.item,
  b1FreeTours: FREE_TOUR_POSTS_B1,
  mezclaUltimos10Dias: mixWindow(posts.map((p) => ({ publishedAt: p.publishedAt, mix: p.mix, draft: p.draft })), plan.today),
  pilaresActivos: PILLARS.filter((p) => p.status === "activo").map((p) => ({ slug: p.slug, nombre: p.name, termino: p.term, comercial: p.commercial })),
  siguientesPendientes: CALENDARIO.filter((c) => !used.has(c.id)).slice(0, 6),
  terminosUsados: posts.map((p) => ({ slug: p.slug, pilar: p.pillar, termino: p.targetTerm, publicado: !p.draft, fecha: p.publishedAt })),
}, null, 2));
