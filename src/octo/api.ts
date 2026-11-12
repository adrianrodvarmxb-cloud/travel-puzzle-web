import { octoHeaders, type OctoConfig } from "./lib/config";
import { HOLD_MINUTES } from "./lib/booking-flow";
import {
  availabilitySchema,
  bookingSchema,
  calendarDaySchema,
  parseEach,
  productSchema,
  type OctoBooking,
} from "./lib/schemas";

/** Error con el status real de Ventrata y su código (`Ventrata-Error-Code` o `error` del cuerpo). */
export class OctoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorCode: string | null,
  ) {
    super(message);
    this.name = "OctoError";
  }
}

interface Deps {
  config: OctoConfig;
  fetch: typeof fetch;
  timeoutMs?: number;
  /** Tope de páginas al leer el catálogo (100 productos por página). */
  maxPages?: number;
}

export interface UnitQty {
  id: string;
  quantity: number;
}

export interface ContactIn {
  fullName: string;
  emailAddress: string;
  phoneNumber?: string;
  country?: string;
  locales?: string[];
}

/**
 * Cliente de Big Bus por Ventrata OCTO (ola 1). Llama directo desde el Worker (Ventrata no pide IP registrada).
 * Productos, disponibilidad y reservas (apartar, confirmar, cancelar, consultar). Se usa solo con la bandera
 * BIGBUS_OCTO_ENABLED encendida; mientras tanto nadie lo llama.
 */
// REQ-3326
export function createOctoApi({ config, fetch: fetchImpl, timeoutMs = 30_000, maxPages = 50 }: Deps) {
  // REQ-3326
  async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<{ json: unknown; res: Response }> {
    const res = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: octoHeaders(config, { json: body !== undefined, language: "es" }),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await res.json().catch(() => null)) as { error?: string; errorMessage?: string; errorCode?: string } | null;
    if (!res.ok) {
      const code = res.headers.get("Ventrata-Error-Code") ?? json?.errorCode ?? json?.error ?? null;
      throw new OctoError(json?.errorMessage ?? json?.error ?? `Ventrata respondió ${res.status}`, res.status, code);
    }
    return { json, res };
  }

  function booking(json: unknown): OctoBooking {
    const r = bookingSchema.safeParse(json);
    if (!r.success) throw new OctoError("Respuesta de reserva inválida", 502, "INVALID_RESPONSE");
    return r.data;
  }

  return {
    // REQ-3326
    async getSupplier(): Promise<unknown> {
      return (await call("GET", "/supplier")).json;
    },

    /** Todo el catálogo que Big Bus deja revender, siguiendo `Octo-Next-Page` hasta que no venga. */
    // REQ-3326
    async getProducts() {
      const all: unknown[] = [];
      let page: string | null = null;
      for (let i = 0; i < maxPages; i++) {
        const q: string = page ? `?limit=100&page=${encodeURIComponent(page)}` : "?limit=100";
        const { json, res } = await call("GET", `/products${q}`);
        if (Array.isArray(json)) all.push(...json);
        page = res.headers.get("Octo-Next-Page");
        // REQ-3415: `raw` es la copia exacta (con net) para el archivo privado; nunca va a la ficha.
        if (!page) return { ...parseEach(productSchema, all), raw: all };
      }
      throw new OctoError(`El catálogo pasó de ${maxPages} páginas`, 500, "TOO_MANY_PAGES");
    },

    // REQ-3326
    async getProduct(productId: string) {
      const { json } = await call("GET", `/products/${encodeURIComponent(productId)}`);
      const r = productSchema.safeParse(json);
      return r.success ? r.data : null;
    },

    // REQ-3326
    async availabilityCalendar(p: { productId: string; optionId: string; localDateStart: string; localDateEnd: string; units?: UnitQty[] }) {
      const { json } = await call("POST", "/availability/calendar", p);
      return parseEach(calendarDaySchema, json);
    },

    // REQ-3326
    async availability(p: { productId: string; optionId: string; localDateStart: string; localDateEnd: string; units?: UnitQty[] }) {
      const { json } = await call("POST", "/availability", p);
      return parseEach(availabilitySchema, json);
    },

    /** Aparta lugares al empezar el pago. `uuid` nuestro para no duplicar si se reintenta. */
    // REQ-3326
    async reserve(p: { uuid: string; productId: string; optionId: string; availabilityId: string; units: UnitQty[]; resellerReference: string }) {
      const unitItems = p.units.flatMap((u) => Array.from({ length: u.quantity }, () => ({ unitId: u.id })));
      const { json } = await call("POST", "/bookings", {
        uuid: p.uuid,
        productId: p.productId,
        optionId: p.optionId,
        availabilityId: p.availabilityId,
        unitItems,
        resellerReference: p.resellerReference,
        expirationMinutes: HOLD_MINUTES,
      });
      return booking(json);
    },

    /** Confirma solo después del cobro. El correo lo manda Travel Puzzle, no Big Bus (marca propia). */
    // REQ-3326
    async confirm(uuid: string, p: { contact: ContactIn; resellerReference: string }) {
      const { json } = await call("POST", `/bookings/${encodeURIComponent(uuid)}/confirm`, {
        contact: p.contact,
        resellerReference: p.resellerReference,
        emailReceipt: false,
      });
      return booking(json);
    },

    // REQ-3326
    async cancel(uuid: string, reason: string) {
      const { json } = await call("POST", `/bookings/${encodeURIComponent(uuid)}/cancel`, { reason });
      return booking(json);
    },

    // REQ-3326
    async getBooking(uuid: string) {
      const { json } = await call("GET", `/bookings/${encodeURIComponent(uuid)}`);
      return booking(json);
    },
  };
}

export type OctoApi = ReturnType<typeof createOctoApi>;
