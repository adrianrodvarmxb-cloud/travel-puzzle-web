// Cliente mínimo de la API de Freetour para la pasarela.
// Sale por la IP registrada (localAddress) y reutiliza el token 50 minutos.
import https from "node:https";

const TOKEN_TTL_MS = 50 * 60 * 1000;

/** Petición HTTPS con JSON. Devuelve { status, json }. */
export function httpsJson(method, url, { headers = {}, body, localAddress, timeoutMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = https.request(
      url,
      {
        method,
        localAddress: localAddress || undefined,
        headers: {
          Accept: "application/json",
          ...(payload && { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }),
          ...headers,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let json = null;
          try { json = raw ? JSON.parse(raw) : null; } catch { json = { raw: raw.slice(0, 500) }; }
          resolve({ status: res.statusCode ?? 0, json });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Freetour no respondió a tiempo")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export function createFreetourClient({ baseUrl, email, password, localAddress, request = httpsJson, now = Date.now }) {
  let token = null;
  let tokenAt = 0;

  async function login() {
    const res = await request("POST", `${baseUrl}/login`, { body: { email, password }, localAddress });
    const accessToken = res.json?.data?.token?.accessToken;
    if (res.status !== 200 || !accessToken) {
      throw new Error(`Freetour login falló (HTTP ${res.status}): ${res.json?.data?.errorMessage ?? "sin detalle"}`);
    }
    token = accessToken;
    tokenAt = now();
  }

  async function send(method, path, body) {
    return request(method, `${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` }, body, localAddress });
  }

  return {
    async call(method, path, body) {
      if (!token || now() - tokenAt > TOKEN_TTL_MS) await login();
      let res = await send(method, path, body);
      if (res.status === 401) {
        await login();
        res = await send(method, path, body);
      }
      return res;
    },
  };
}
