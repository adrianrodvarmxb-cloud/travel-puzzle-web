/**
 * Punto de entrada del Worker en Cloudflare.
 *
 * - fetch: el sitio Next.js que genera OpenNext.
 * - scheduled: cron cada minuto. Llama a la ruta interna con el secreto del cron;
 *   cada llamada procesa una página del catálogo (corrida diaria desde las 3:00 a. m.
 *   hora de México) o, si ya terminó, actualiza reseñas. Cada 5 minutos además
 *   manda los recordatorios y la petición de reseña de las reservas.
 */
// @ts-ignore: lo genera `opennextjs-cloudflare build` (puede no existir aún)
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
    // REQ-586: una vez al día (12:10 UTC, ya cerrado el sync de las 3:00 de CDMX), IndexNow. La ruta no hace nada
    // mientras INDEXNOW_ENABLED no sea "true".
    const now = new Date();
    if (now.getUTCHours() === 12 && now.getUTCMinutes() === 10) {
      const indexnow = new Request("https://internal/api/cron/indexnow", {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });
      ctx.waitUntil(
        handler.fetch(indexnow, env, ctx).then(async (res: Response) => {
          console.log(`[cron] indexnow → ${res.status} ${await res.text()}`);
        })
      );
    }
    // Cada 5 minutos: recordatorios y reseña post-tour.
    if (new Date().getUTCMinutes() % 5 === 0) {
      const emails = new Request("https://internal/api/cron/booking-emails", {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });
      ctx.waitUntil(
        handler.fetch(emails, env, ctx).then(async (res: Response) => {
          console.log(`[cron] booking-emails → ${res.status} ${await res.text()}`);
        })
      );
    }
  },
};
