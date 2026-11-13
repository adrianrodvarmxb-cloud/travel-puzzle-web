/** REQ-3533 / REQ-3534: dependencias reales de la compra directa (D1, Stripe, Banxico y Resend). */
import { getPrisma } from "@/lib/prisma";
import { sendEmail } from "@/notifications/resend";
import { createStripeClient } from "@/payments/stripe-client";
import { isStripeEnabled } from "@/payments/lib/checkout";
import { createTripRepo } from "./repository";
import { isKindVisible } from "./lib/visibility";
import { isDirectBuyEnabled } from "./lib/direct-buy";
import { loadFx, siteVisibility } from "./public-load";
import { isPubliclyReachable } from "./lib/trip";
import type { BuyDeps, BuyRecord } from "./direct-buy";

const env = () => process.env as Record<string, string | undefined>;

export const directBuyEnabled = () => isDirectBuyEnabled(env().TRIPS_DIRECT_BUY_ENABLED);

function cushion(): number {
  const n = Number(env().STRIPE_FX_CUSHION_PCT);
  return Number.isFinite(n) && n >= 0 && n <= 20 ? n : 3;
}

export function buyDeps(): BuyDeps {
  const e = env();
  const prisma = getPrisma();
  const repo = createTripRepo(prisma);
  const stripe = createStripeClient({ secretKey: e.STRIPE_SECRET_KEY ?? "", fetch });
  const site = e.SITE_URL ?? "";
  const send = (m: { to: string; subject: string; html: string; text: string }) =>
    sendEmail({ apiKey: e.RESEND_API_KEY ?? "", fetch }, { ...m, from: e.EMAIL_FROM ?? "", replyTo: e.EMAIL_REPLY_TO });
  return {
    now: new Date(),
    siteUrl: site,
    logoUrl: `${site}/brand/logo-tp-oscuro.png`,
    cushionPct: cushion(),
    // Reusa el secreto interno del sitio con un prefijo propio (no hace falta un secreto nuevo).
    secret: e.AUTH_SECRET ?? "",
    enabled: directBuyEnabled(),
    stripeEnabled: isStripeEnabled(e.STRIPE_ENABLED),
    newId: (p) => `${p}_${crypto.randomUUID().replace(/-/g, "")}`,
    random: () => crypto.randomUUID().replace(/-/g, ""),
    async findTrip(id) {
      const t = await repo.findById(id);
      return t && isPubliclyReachable(t.status) && isKindVisible(t.kind, siteVisibility()) ? t : null;
    },
    getRates: loadFx,
    async saveRequest(row) { await prisma.tripRequest.create({ data: row as unknown as import("@prisma/client").Prisma.TripRequestUncheckedCreateInput }); },
    createSession: (params) => stripe.createCheckoutSession(params),
    insertPayment: (row) => prisma.payment.create({ data: row as never }),
    async findBuy(id): Promise<BuyRecord | null> {
      const r = await prisma.tripRequest.findUnique({ where: { id } });
      if (!r) return null;
      const trip = await prisma.trip.findUnique({ where: { id: r.tripId }, select: { agencyId: true } });
      const agency = trip?.agencyId ? await prisma.agency.findUnique({ where: { id: trip.agencyId }, select: { email: true } }) : null;
      const p = await prisma.payment.findFirst({ where: { requestId: id, status: "paid" }, orderBy: { paidAt: "desc" }, select: { id: true, paymentIntent: true, amountCentavos: true, paidAt: true } });
      return {
        id: r.id, ref: r.ref, kind: r.kind, status: r.status, tripTitle: r.tripTitle, tripCode: r.tripCode, date: r.date, time: r.time,
        optionName: r.optionName, adults: r.adults, children: r.children, infants: r.infants, firstName: r.firstName, lastName: r.lastName,
        email: r.email, hotel: r.hotel, supplierEmail: agency?.email?.trim() || null, payment: p ?? null,
      };
    },
    async transition(id, from, to) {
      const { count } = await prisma.tripRequest.updateMany({ where: { id, status: { in: from } }, data: { status: to } });
      return count > 0;
    },
    refund: (pi, key) => stripe.refundPaymentIntent(pi, key),
    async listAwaitingSupplier() {
      const rows = await prisma.tripRequest.findMany({ where: { kind: "compra", status: "awaiting_supplier" }, select: { id: true }, take: 200 });
      const out: { id: string; paidAt: Date | null }[] = [];
      for (const r of rows) {
        const p = await prisma.payment.findFirst({ where: { requestId: r.id, status: "paid" }, orderBy: { paidAt: "desc" }, select: { paidAt: true } });
        out.push({ id: r.id, paidAt: p?.paidAt ?? null });
      }
      return out;
    },
    sendCustomer: send,
    sendSupplier: send,
    sendTeam: (m) => send({ ...m, to: e.EMAIL_REPLY_TO ?? "info@travelpuzzle.com.mx" }),
  };
}

/**
 * REQ-3533: gancho del webhook de Stripe. Va siempre (aunque la bandera se apague después, una compra ya
 * pagada sigue su curso); para cualquier otra solicitud devuelve false y el webhook sigue como hoy.
 */
export function directBuyHook(): (requestId: string) => Promise<boolean> {
  return async (requestId) => {
    const { onDirectBuyPaid } = await import("./direct-buy");
    return onDirectBuyPaid(requestId, buyDeps());
  };
}
