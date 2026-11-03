// Atiende una petición ya leída. Sin red ni servidor: todo llega por parámetros.
import { verify } from "./signature.js";
import { toFreetourRequest } from "./operations.js";
import { bookingKey } from "./dedupe.js";

// El mensaje de Freetour ayuda a diagnosticar; se le quitan correos y teléfonos.
const scrub = (m) =>
  typeof m === "string"
    ? m.replace(/[^\s@]+@[^\s@]+/g, "[correo]").replace(/\+?\d[\d\s-]{6,}\d/g, "[número]").slice(0, 200)
    : null;

export async function handleRequest({ method, path, headers, body }, { secret, now, freetour, log, dedupe }) {
  if (method === "GET" && path === "/health") return { status: 200, json: { ok: true } };
  if (method !== "POST" || path !== "/freetour") return { status: 404, json: { error: "not found" } };

  const check = verify(secret, {
    timestamp: headers["x-tp-timestamp"],
    signature: headers["x-tp-signature"],
    body,
    now: now(),
  });
  if (!check.ok) {
    log("rechazada", { motivo: check.reason });
    return { status: 401, json: { error: "unauthorized" } };
  }

  let msg;
  try { msg = JSON.parse(body); } catch { return { status: 400, json: { error: "json inválido" } }; }

  const req = toFreetourRequest(msg?.op, msg?.payload);
  if (!req.ok) return { status: 400, json: { error: req.reason } };

  try {
    const key = msg.op === "createBooking" ? bookingKey(msg.payload) : null;
    const { res, replayed } = await dedupe.run(key, () => freetour.call(req.method, req.path, req.body));
    // Solo datos operativos en el registro (nunca nombre, correo o teléfono).
    if (replayed) log("repetida", { op: msg.op, http: res.status });
    else log("freetour", { op: msg.op, http: res.status, errorCode: res.json?.data?.errorCode ?? null, errorMessage: scrub(res.json?.data?.errorMessage) });
    return { status: res.status, json: res.json };
  } catch (error) {
    log("error", { op: msg.op, error: error.message });
    return { status: 502, json: { error: "Freetour no disponible" } };
  }
}
