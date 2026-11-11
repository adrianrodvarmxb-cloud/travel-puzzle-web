// Cliente de la API de Tangol para la pasarela (REQ-1550).
// Sale por la misma IP registrada que Freetour (66.29.153.81) y reutiliza el token 50 minutos.
import { httpsJson } from "./freetour.js";

const TOKEN_TTL_MS = 50 * 60 * 1000;
// Tras una autenticación fallida no se reintenta enseguida (evita bloqueos de la cuenta).
const AUTH_BACKOFF_MS = 60 * 1000;

const withQuery = (url, query) => {
  if (!query) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, String(v));
  return u.toString();
};

// REQ-1550
export function createTangolClient({ baseUrl, email, clave, localAddress, request = httpsJson, now = Date.now }) {
  let token = null;
  let tokenAt = 0;
  let failedAt = null;

  async function authenticate() {
    if (failedAt !== null && now() - failedAt < AUTH_BACKOFF_MS) {
      throw new Error("Tangol: autenticación en espera tras un intento fallido");
    }
    const res = await request("POST", `${baseUrl}/Tour/Autenticacion`, { body: { email, clave }, localAddress });
    const tok = typeof res.json === "string" ? res.json.trim() : "";
    if (res.status !== 200 || !tok) {
      failedAt = now();
      throw new Error(`Tangol: autenticación falló (HTTP ${res.status})`);
    }
    token = tok;
    tokenAt = now();
    failedAt = null;
  }

  const send = (method, path, { query, body } = {}) =>
    request(method, withQuery(`${baseUrl}${path}`, query), { headers: { Authorization: `Bearer ${token}` }, body, localAddress });

  return {
    async call(method, path, opts) {
      if (!token || now() - tokenAt > TOKEN_TTL_MS) await authenticate();
      let res = await send(method, path, opts);
      if (res.status === 401) {
        await authenticate();
        res = await send(method, path, opts);
      }
      return res;
    },
  };
}
