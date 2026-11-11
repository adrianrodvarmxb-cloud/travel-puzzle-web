import type { TangolConfig } from "./lib/config";
import { countrySchema, destinationSchema, infoTourSchema, parseEach, parseTourRates } from "./lib/schemas";
import { signRequest } from "../booking/lib/signature";

/** Error con el status real de la pasarela (o de Tangol, que la pasarela reenvía). */
export class TangolError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TangolError";
  }
}

interface Deps {
  config: TangolConfig;
  fetch: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

/**
 * Cliente de solo lectura de Tangol (ola 1). Todo va por la pasarela firmada (`POST /tangol`), que se
 * autentica con Tangol y sale por la IP registrada. Reservas y cancelaciones van en la ola 4 (REQ-1548).
 */
// REQ-1552, REQ-1541, REQ-1542
export function createTangolApi({ config, fetch: fetchImpl, now = Date.now, timeoutMs = 35_000 }: Deps) {
  // REQ-1552
  async function call(op: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    const body = JSON.stringify({ op, payload });
    const timestamp = String(now());
    const res = await fetchImpl(`${config.gatewayUrl.replace(/\/+$/, "")}/tangol`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tp-timestamp": timestamp,
        "x-tp-signature": await signRequest(config.secret, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) throw new TangolError(json?.error ?? `Pasarela respondió ${res.status}`, res.status);
    return json;
  }

  return {
    // REQ-1541
    async getCountries() {
      const body = (await call("getCountries")) as { ListCountries?: unknown } | null;
      return parseEach(countrySchema, body?.ListCountries);
    },
    // REQ-1541
    async getDestinations(countryCode: string) {
      const body = (await call("getDestinations", { countryCode })) as { ListDestinations?: unknown } | null;
      return parseEach(destinationSchema, body?.ListDestinations);
    },
    // REQ-1541
    async getTourList(p: { destinationId: number; languageCode: number; currency: number; includeDetails?: boolean }) {
      const body = (await call("getTourList", { ...p })) as { ListTours?: unknown } | null;
      return parseEach(infoTourSchema, body?.ListTours);
    },
    // REQ-1542
    async getTourRates(p: { tourId: number; languageCode: string; currency: string }) {
      return parseTourRates(await call("getTourRates", { ...p }));
    },
  };
}
