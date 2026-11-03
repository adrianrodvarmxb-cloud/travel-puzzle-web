// Evita reservas duplicadas: el mismo intento (token del formulario + mismos datos)
// se manda a Freetour una sola vez durante 24 h; los repetidos reciben la primera respuesta.
// Solo se recuerdan las respuestas buenas: un error se puede reintentar.
// Vive en memoria: si cPanel reinicia la app se olvida (el sitio además bloquea traslapes).
import { createHash } from "node:crypto";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Llave del intento, o null si no trae token. El correo se compara sin mayúsculas. */
export function bookingKey(p) {
  if (!p?.idempotencyKey) return null;
  const email = String(p.customer?.email ?? "").trim().toLowerCase();
  const raw = [p.idempotencyKey, p.eventId, p.adults, p.children, email].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

const isOk = (res) => res && res.status >= 200 && res.status < 300;

export function createDedupe({ ttlMs = DAY_MS, max = 5000, now = Date.now } = {}) {
  const entries = new Map(); // llave → { at, promise }; en orden de llegada

  function sweep() {
    const t = now();
    for (const [k, e] of entries) {
      if (t - e.at <= ttlMs) break;
      entries.delete(k);
    }
    while (entries.size > max) entries.delete(entries.keys().next().value);
  }

  return {
    async run(key, fn) {
      sweep();
      if (!key) return { res: await fn(), replayed: false };
      const hit = entries.get(key);
      if (hit) return { res: await hit.promise, replayed: true };

      const promise = (async () => fn())();
      entries.set(key, { at: now(), promise });
      sweep();
      try {
        const res = await promise;
        if (!isOk(res)) entries.delete(key);
        return { res, replayed: false };
      } catch (error) {
        entries.delete(key);
        throw error;
      }
    },
    size: () => entries.size,
  };
}
