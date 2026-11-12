/**
 * Dependencias reales de Big Bus por OCTO: Ventrata (fetch), D1 (OctoBooking y OctoCatalogPlan),
 * Prisma (TripRequest, Payment), Stripe, Banxico y Resend. Todo lo de aquí es I/O; la lógica vive en el dominio.
 */
import { getD1, getPrisma } from "@/lib/prisma";
import { sendEmail } from "@/notifications/resend";
import { loadFx } from "@/trips/public-load";
import { createStripeClient } from "@/payments/stripe-client";
import { isStripeEnabled } from "@/payments/lib/checkout";
import { requestRef } from "@/trips/lib/request";
import { idFor } from "@/trips/lib/bulk-import";
import { createOctoApi } from "./api";
import { bigBusOctoConfig } from "./lib/config";
import type { CatalogPlan, CityKeywords } from "./lib/catalog";
import type { PlanStore, CatalogSyncDeps } from "./catalog-sync";
import type { OctoBookingRow, PurchaseDeps, RequestInfo } from "./purchase";
import cityKeywords from "./data/bigbus-ciudades.json";
import bigbusImport from "../../imports/bigbus-2026.json";

const env = () => process.env as Record<string, string | undefined>;

/** Iniciales de la agencia Big Bus en el gestor (imports/bigbus-2026.json → "BBT"). */
const AGENCY_INITIALS = (bigbusImport as { agency: { initials: string } }).agency.initials;
export const BIGBUS_CITY_REFS = (bigbusImport as { trips: { ref: string }[] }).trips.map((t) => t.ref);
export const BIGBUS_CITY_KEYWORDS = cityKeywords as unknown as CityKeywords;

/** Cliente OCTO o null (bandera apagada o sin llave). */
export function octoApiFromEnv() {
  const config = bigBusOctoConfig(env());
  return config ? createOctoApi({ config, fetch }) : null;
}

interface D1Exec {
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown>; first<T = Record<string, unknown>>(): Promise<T | null> } };
}
const d1 = () => getD1() as unknown as D1Exec;

const PLAN_PROVIDER = "bigbus-octo";

/**
 * Plan del catálogo en D1 (tabla OctoCatalogPlan, migración 0027). No usa el bucket del archivo crudo:
 * ese solo lo toca el cron de sync-tours y es solo escritura (REQ-747).
 */
// REQ-3415
export function planStoreFromEnv(): PlanStore {
  return {
    async load() {
      const r = await d1().prepare(`SELECT "plan" FROM "OctoCatalogPlan" WHERE "provider" = ?`).bind(PLAN_PROVIDER).first<{ plan: string }>();
      if (!r) return null;
      try {
        return JSON.parse(r.plan) as CatalogPlan;
      } catch {
        return null;
      }
    },
    async save(plan) {
      await d1()
        .prepare(`INSERT INTO "OctoCatalogPlan" ("provider", "plan", "updatedAt") VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT("provider") DO UPDATE SET "plan" = excluded."plan", "updatedAt" = CURRENT_TIMESTAMP`)
        .bind(PLAN_PROVIDER, JSON.stringify(plan))
        .run();
    },
  };
}

export function catalogSyncDeps(now: Date): CatalogSyncDeps {
  return {
    api: octoApiFromEnv(),
    store: planStoreFromEnv(),
    // REQ-3433: la copia exacta al archivo privado espera la decisión del PO sobre REQ-747 (hoy solo sync-tours
    // puede tocar ese bucket). La sincronización ya la soporta (`archive`); aquí queda sin conectar.
    archive: undefined,
    cityRefs: BIGBUS_CITY_REFS,
    map: BIGBUS_CITY_KEYWORDS,
    now,
    runId: `bigbus-octo-${now.toISOString()}`,
  };
}

const COLS = ["id", "requestId", "paymentId", "uuid", "productId", "optionId", "availabilityId", "status", "supplierReference", "delivery", "expiresAt"] as const;

function rowFrom(r: Record<string, unknown> | null): OctoBookingRow | null {
  if (!r) return null;
  let delivery: OctoBookingRow["delivery"] = null;
  try {
    delivery = r.delivery ? JSON.parse(String(r.delivery)) : null;
  } catch {
    delivery = null;
  }
  return {
    id: String(r.id), requestId: String(r.requestId), paymentId: String(r.paymentId), uuid: String(r.uuid), productId: String(r.productId),
    optionId: String(r.optionId), availabilityId: String(r.availabilityId), status: r.status as OctoBookingRow["status"],
    supplierReference: (r.supplierReference as string | null) ?? null, delivery, expiresAt: (r.expiresAt as string | null) ?? null,
  };
}

const findBy = (col: "requestId" | "paymentId") => async (v: string) =>
  rowFrom(await d1().prepare(`SELECT * FROM "OctoBooking" WHERE "${col}" = ? ORDER BY "createdAt" DESC LIMIT 1`).bind(v).first());

const REQ_SELECT = { id: true, ref: true, tripTitle: true, date: true, firstName: true, lastName: true, email: true, phone: true, optionName: true, adults: true, children: true, infants: true } as const;

function mailer() {
  const e = env();
  const send = (m: { to: string; subject: string; html: string; text: string }) =>
    sendEmail({ apiKey: e.RESEND_API_KEY ?? "", fetch }, { ...m, from: e.EMAIL_FROM ?? "", replyTo: e.EMAIL_REPLY_TO });
  return { send, team: (m: { subject: string; html: string; text: string }) => send({ ...m, to: e.EMAIL_REPLY_TO ?? "info@travelpuzzle.com.mx" }) };
}

export function purchaseDeps(): PurchaseDeps {
  const e = env();
  const prisma = getPrisma();
  const stripe = createStripeClient({ secretKey: e.STRIPE_SECRET_KEY ?? "", fetch });
  const site = (e.SITE_URL ?? "").replace(/\/+$/, "");
  const cushion = Number(e.STRIPE_FX_CUSHION_PCT);
  const m = mailer();
  return {
    now: new Date(),
    siteUrl: site,
    logoUrl: `${site}/brand/logo-tp-oscuro.png`,
    cushionPct: Number.isFinite(cushion) && cushion >= 0 && cushion <= 20 ? cushion : 3,
    api: octoApiFromEnv(),
    stripeEnabled: isStripeEnabled(e.STRIPE_ENABLED),
    newUuid: () => crypto.randomUUID(),
    newId: (p) => `${p}_${crypto.randomUUID().replace(/-/g, "")}`,
    newRef: () => requestRef(new Date(), crypto.randomUUID()),
    loadPlan: () => planStoreFromEnv().load(),
    getRates: loadFx,
    tripIdFor: (ref) => idFor(AGENCY_INITIALS, ref),
    saveRequest: async (row) => void (await prisma.tripRequest.create({ data: row as never })),
    setRequestStatus: (id, status) => prisma.tripRequest.update({ where: { id }, data: { status } }),
    findRequest: async (id) => (await prisma.tripRequest.findUnique({ where: { id }, select: REQ_SELECT })) as RequestInfo | null,
    findRequestByRef: async (ref, email) => {
      const r = await prisma.tripRequest.findUnique({ where: { ref }, select: REQ_SELECT });
      return r && r.email.trim().toLowerCase() === email ? (r as RequestInfo) : null;
    },
    createSession: (params) => stripe.createCheckoutSession(params),
    insertPayment: (row) => prisma.payment.create({ data: row as never }),
    insertBooking: (row) =>
      d1()
        .prepare(`INSERT INTO "OctoBooking" (${COLS.map((c) => `"${c}"`).join(", ")}) VALUES (${COLS.map(() => "?").join(", ")})`)
        .bind(...COLS.map((c) => (c === "delivery" ? (row.delivery ? JSON.stringify(row.delivery) : null) : row[c])))
        .run(),
    updateBooking: async (id, patch) => {
      const keys = Object.keys(patch).filter((k) => (COLS as readonly string[]).includes(k) && k !== "id") as (keyof OctoBookingRow)[];
      if (keys.length === 0) return;
      const vals = keys.map((k) => (k === "delivery" ? JSON.stringify(patch.delivery ?? null) : patch[k]));
      await d1()
        .prepare(`UPDATE "OctoBooking" SET ${keys.map((k) => `"${k}" = ?`).join(", ")}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`)
        .bind(...vals, id)
        .run();
    },
    findBookingByRequest: findBy("requestId"),
    findBookingByPayment: findBy("paymentId"),
    sendCustomer: m.send,
    sendTeam: m.team,
  };
}

/** Para el webhook de Stripe: ganchos solo si la bandera de Big Bus está encendida. */
export function purchaseHooksFromEnv() {
  if (!bigBusOctoConfig(env())) return {};
  return {
    afterPaid: async (requestId: string) => {
      const { onPurchasePaid } = await import("./purchase");
      return (await onPurchasePaid(requestId, purchaseDeps())) !== "not_octo";
    },
    afterExpired: async (paymentId: string) => {
      const { onPurchaseExpired } = await import("./purchase");
      return onPurchaseExpired(paymentId, purchaseDeps());
    },
  };
}
