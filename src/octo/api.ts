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
  async function call(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<{ json: unknown; res: Response }> {
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
    // REQ-3436: `currency` pide los precios en esa moneda (USD por decisión del PO).
    async availabilityCalendar(p: { productId: string; optionId: string; localDateStart: string; localDateEnd: string; units?: UnitQty[]; currency?: string }) {
      const { json } = await call("POST", "/availability/calendar", p);
      return parseEach(calendarDaySchema, json);
    },

    // REQ-3326
    async availability(p: { productId: string; optionId: string; localDateStart: string; localDateEnd: string; units?: UnitQty[]; currency?: string }) {
      const { json } = await call("POST", "/availability", p);
      return parseEach(availabilitySchema, json);
    },

    /** Aparta lugares al empezar el pago. `uuid` nuestro para no duplicar si se reintenta. */
    // REQ-3326
    // REQ-3436: `currency` fija la moneda de la reserva (si no, el operador usa su moneda base).
    async reserve(p: { uuid: string; productId: string; optionId: string; availabilityId: string; units: UnitQty[]; resellerReference: string; currency?: string }) {
      const unitItems = p.units.flatMap((u) => Array.from({ length: u.quantity }, () => ({ unitId: u.id })));
      const { json } = await call("POST", "/bookings", {
        uuid: p.uuid,
        productId: p.productId,
        optionId: p.optionId,
        availabilityId: p.availabilityId,
        unitItems,
        resellerReference: p.resellerReference,
        expirationMinutes: HOLD_MINUTES,
        ...(p.currency ? { currency: p.currency } : {}),
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

    /**
     * Cambia fecha, opción o personas de una reserva (PATCH /bookings/{uuid}). Lo pide la certificación de
     * Ventrata. Solo se mandan los campos que cambian.
     */
    // REQ-3453
    async update(uuid: string, p: { optionId?: string; availabilityId?: string; units?: UnitQty[]; resellerReference?: string; currency?: string }) {
      const body: Record<string, unknown> = {};
      if (p.currency) body.currency = p.currency; // REQ-3436
      if (p.optionId) body.optionId = p.optionId;
      if (p.availabilityId) body.availabilityId = p.availabilityId;
      if (p.resellerReference) body.resellerReference = p.resellerReference;
      if (p.units) body.unitItems = p.units.flatMap((u) => Array.from({ length: u.quantity }, () => ({ unitId: u.id })));
      if (Object.keys(body).filter((k) => k !== "currency").length === 0) throw new OctoError("No hay cambios que mandar", 400, "EMPTY_UPDATE");
      const { json } = await call("PATCH", `/bookings/${encodeURIComponent(uuid)}`, body);
      return booking(json);
    },
  };
}

export type OctoApi = ReturnType<typeof createOctoApi>;
