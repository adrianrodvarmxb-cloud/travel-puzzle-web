/**
 * Punto de entrada del Worker en Cloudflare.
 *
 * - fetch: el sitio Next.js que genera OpenNext.
 * - scheduled: el cron de sincronización del catálogo (cada minuto de 3:00 a
 *   4:59 a. m. hora de México). Llama a la ruta interna con el secreto del cron;
 *   cada llamada procesa una página.
 */
// @ts-expect-error: lo genera `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";

interface Env {
  CRON_SECRET?: string;
}

// Tipos mínimos del runtime de Workers (el archivo de tipos generado solo trae las variables).
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  fetch: handler.fetch,

  async scheduled(_event: unknown, env: Env, ctx: WorkerContext) {
    if (!env.CRON_SECRET) {
      console.warn("[cron] CRON_SECRET no configurado; se omite la sincronización");
      return;
    }
    const request = new Request("https://internal/api/cron/sync-tours", {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    ctx.waitUntil(
      handler.fetch(request, env, ctx).then(async (res: Response) => {
        console.log(`[cron] sync-tours → ${res.status} ${await res.text()}`);
      })
    );
  },
};
