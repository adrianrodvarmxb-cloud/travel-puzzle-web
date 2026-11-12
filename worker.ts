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
import { stripEdgeCacheUnlessOk } from "./src/perf/lib/edge-cache";

interface Env {
  CRON_SECRET?: string;
}

// Tipos mínimos del runtime de Workers (el archivo de tipos generado solo trae las variables).
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

// REQ-1291: correo que llega por Email Routing (copia del reenvío de comercial@ en cPanel).
interface IncomingEmail { raw: ReadableStream; from: string; to: string }

export default {
  // REQ-3318: solo un 200 sale marcado como guardable en el borde (un 5xx nunca se guarda).
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    return stripEdgeCacheUnlessOk(await handler.fetch(request, env, ctx));
  },

  async email(message: IncomingEmail, env: Env, ctx: WorkerContext) {
    if (!env.CRON_SECRET) return;
    const req = new Request("https://internal/api/proveedores/correo", {
      method: "POST",
      headers: { authorization: `Bearer ${env.CRON_SECRET}`, "content-type": "message/rfc822" },
      body: await new Response(message.raw).arrayBuffer(),
    });
    const res: Response = await handler.fetch(req, env, ctx);
    console.log(`[correo] proveedores → ${res.status} ${await res.text()}`);
  },

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
    // Cada 10 minutos: pagos pendientes de tours de pago (REQ-012; la ruta no hace nada con PAID_TOURS_ENABLED apagado).
    if (new Date().getUTCMinutes() % 10 === 0) {
      const payments = new Request("https://internal/api/cron/payments", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
      ctx.waitUntil(handler.fetch(payments, env, ctx).then(async (res: Response) => console.log(`[cron] payments → ${res.status} ${await res.text()}`)));
    }
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
    // REQ-1293, REQ-1566: cada hora en punto; a cada proveedor solo se le escribe en su horario hábil.
    const ahora = new Date();
    if (ahora.getUTCMinutes() === 0) {
      const proveedores = new Request("https://internal/api/cron/proveedores", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
      ctx.waitUntil(handler.fetch(proveedores, env, ctx).then(async (res: Response) => console.log(`[cron] proveedores → ${res.status} ${await res.text()}`)));
    }

    // REQ-3416: una vez al día (12:20 UTC), catálogo de Big Bus por Ventrata OCTO. La ruta no hace nada mientras
    // BIGBUS_OCTO_ENABLED no sea "true".
    if (now.getUTCHours() === 12 && now.getUTCMinutes() === 20) {
      const bigbus = new Request("https://internal/api/cron/bigbus-sync", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
      ctx.waitUntil(handler.fetch(bigbus, env, ctx).then(async (res: Response) => console.log(`[cron] bigbus-sync → ${res.status} ${await res.text()}`)));
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
