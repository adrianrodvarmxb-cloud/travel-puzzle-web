// Atiende una petición ya leída. Sin red ni servidor: todo llega por parámetros.
import { verify } from "./signature.js";
import { toFreetourRequest } from "./operations.js";

export async function handleRequest({ method, path, headers, body }, { secret, now, freetour, log }) {
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
    const res = await freetour.call(req.method, req.path, req.body);
    // Solo datos operativos en el registro (nunca nombre, correo o teléfono).
    log("freetour", { op: msg.op, http: res.status, errorCode: res.json?.data?.errorCode ?? null });
    return { status: res.status, json: res.json };
  } catch (error) {
    log("error", { op: msg.op, error: error.message });
    return { status: 502, json: { error: "Freetour no disponible" } };
  }
}
