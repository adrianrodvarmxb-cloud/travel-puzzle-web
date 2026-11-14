/** Dependencias reales de pagos: D1 (Prisma), Stripe, Banxico y Resend. */
import { getPrisma } from "@/lib/prisma";
import { sendEmail } from "@/notifications/resend";
import { loadFx } from "@/trips/public-load";
import { createStripeClient } from "./stripe-client";
import { isStripeEnabled, type PaymentKind, type PayCurrency } from "./lib/checkout";
import { isHoldEnabled } from "./lib/hold";
import { verifyStripeSignature } from "./lib/webhook";
import { createPaymentLink, type LinkDeps, type WebhookDeps, type PayRequest } from "./service";
import type { HoldDeps } from "./hold";
import type { SettleDeps } from "./settle";
import { purchaseHooksFromEnv } from "@/octo/deps";

const env = () => process.env as Record<string, string | undefined>;

export const stripeEnabled = () => isStripeEnabled(env().STRIPE_ENABLED);

function cushion(): number {
  const n = Number(env().STRIPE_FX_CUSHION_PCT);
  return Number.isFinite(n) && n >= 0 && n <= 20 ? n : 3;
}

function mailer() {
  const e = env();
  const send = (m: { to: string; subject: string; html: string; text: string }) =>
    sendEmail({ apiKey: e.RESEND_API_KEY ?? "", fetch }, { ...m, from: e.EMAIL_FROM ?? "", replyTo: e.EMAIL_REPLY_TO });
  return { send, team: (m: { subject: string; html: string; text: string }) => send({ ...m, to: e.EMAIL_REPLY_TO ?? "info@travelpuzzle.com.mx" }) };
}

async function findRequest(id: string): Promise<PayRequest | null> {
  const r = await getPrisma().tripRequest.findUnique({ where: { id }, select: { id: true, ref: true, tripTitle: true, email: true, firstName: true, language: true } });
  return r ?? null;
}

const setRequestStatus = (id: string, status: string) => getPrisma().tripRequest.update({ where: { id }, data: { status } });

export function linkDeps(): LinkDeps {
  const e = env();
  const prisma = getPrisma();
  const stripe = createStripeClient({ secretKey: e.STRIPE_SECRET_KEY ?? "", fetch });
  const site = e.SITE_URL ?? "";
  return {
    enabled: stripeEnabled(),
    now: new Date(),
    cushionPct: cushion(),
    siteUrl: site,
    logoUrl: `${site}/brand/logo-tp-oscuro.png`,
    newId: () => `pay_${crypto.randomUUID().replace(/-/g, "")}`,
    findRequest,
    getRates: loadFx,
    listPending: async (requestId) =>
      (await prisma.payment.findMany({ where: { requestId, status: "pending" }, select: { id: true, stripeSessionId: true } })).map((p) => ({ id: p.id, sessionId: p.stripeSessionId })),
    expireSession: (id) => stripe.expireCheckoutSession(id),
    markReplaced: (id) => prisma.payment.update({ where: { id }, data: { status: "replaced" } }),
    createSession: (params) => stripe.createCheckoutSession(params),
    insertPayment: (row) => prisma.payment.create({ data: row }),
    setRequestStatus,
    sendCustomer: mailer().send,
  };
}

export function webhookDeps(): WebhookDeps {
  const e = env();
  const prisma = getPrisma();
  const site = e.SITE_URL ?? "";
  const m = mailer();
  return {
    enabled: stripeEnabled(),
    secret: e.STRIPE_WEBHOOK_SECRET ?? "",
    now: new Date(),
    siteUrl: site,
    logoUrl: `${site}/brand/logo-tp-oscuro.png`,
    verify: verifyStripeSignature,
    // REQ-117: actualización condicional = idempotente aunque Stripe repita el aviso.
    async markPaid(id, data) {
      const { count } = await prisma.payment.updateMany({
        where: { id, status: { not: "paid" } },
        data: { status: "paid", paidAt: data.paidAt, paymentIntent: data.paymentIntent, amountCentavos: data.amountCentavos || undefined },
      });
      if (count === 0) return null;
      const p = await prisma.payment.findUnique({ where: { id }, select: { id: true, requestId: true, kind: true, amountCentavos: true } });
      return p ? { ...p, kind: p.kind as PaymentKind } : null;
    },
    markExpired: (id) => prisma.payment.updateMany({ where: { id, status: "pending" }, data: { status: "expired" } }),
    // REQ-3482: solo desde «pendiente»: un aviso repetido o tardío nunca baja un pago ya retenido, pagado o liberado.
    async markHeld(id, data) {
      const { count } = await prisma.payment.updateMany({
        where: { id, status: "pending" },
        data: { status: "held", paymentIntent: data.paymentIntent, amountCentavos: data.amountCentavos || undefined },
      });
      if (count === 0) return null;
      const p = await prisma.payment.findUnique({ where: { id }, select: { id: true, requestId: true, kind: true, amountCentavos: true } });
      return p ? { ...p, kind: p.kind as PaymentKind } : null;
    },
    findRequest,
    setRequestStatus,
    sendCustomer: m.send,
    sendTeam: m.team,
    // REQ-3419: compra directa de Big Bus (solo con BIGBUS_OCTO_ENABLED encendida; si no, no agrega nada).
    ...purchaseHooksFromEnv(),
  };
}

export async function listPayments(requestIds: string[]) {
  if (requestIds.length === 0) return [];
  return getPrisma().payment.findMany({
    where: { requestId: { in: requestIds } },
    orderBy: { createdAt: "desc" },
    select: { id: true, requestId: true, kind: true, amountCentavos: true, originalAmount: true, originalCurrency: true, status: true, expiresAt: true, paidAt: true, checkoutUrl: true },
  });
}

/** REQ-3482: retención al solicitar (STRIPE_HOLD_ENABLED). */
export function holdDeps(): HoldDeps {
  const e = env();
  return {
    holdFlag: e.STRIPE_HOLD_ENABLED,
    stripeFlag: e.STRIPE_ENABLED,
    async findByRef(ref) {
      const r = await getPrisma().tripRequest.findUnique({ where: { ref }, select: { id: true, kind: true, estimate: true, currency: true } });
      return r ? { id: r.id, kind: r.kind, estimate: r.estimate, currency: r.currency as PayCurrency } : null;
    },
    createHold: (input) => createPaymentLink(input, linkDeps()),
  };
}

/** REQ-3483: cobrar o liberar lo retenido (STRIPE_HOLD_ENABLED). */
export function settleDeps(): SettleDeps {
  const e = env();
  const prisma = getPrisma();
  const stripe = createStripeClient({ secretKey: e.STRIPE_SECRET_KEY ?? "", fetch });
  const site = e.SITE_URL ?? "";
  const m = mailer();
  return {
    enabled: isHoldEnabled(e.STRIPE_HOLD_ENABLED) && stripeEnabled(),
    now: new Date(),
    siteUrl: site,
    logoUrl: `${site}/brand/logo-tp-oscuro.png`,
    async findHeld(ref) {
      const r = await prisma.tripRequest.findUnique({ where: { ref }, select: { id: true, ref: true, tripTitle: true, email: true, firstName: true, date: true, adults: true, children: true, infants: true } });
      if (!r) return null;
      const p = await prisma.payment.findFirst({
        where: { requestId: r.id, status: "held" }, orderBy: { createdAt: "desc" },
        select: { id: true, paymentIntent: true, amountCentavos: true, originalAmount: true, originalCurrency: true, kind: true },
      });
      return p ? { request: r, payment: { ...p, kind: p.kind as PaymentKind } } : null;
    },
    capture: (pi, centavos, key) => stripe.capturePaymentIntent(pi, centavos, key),
    cancel: (pi, key) => stripe.cancelPaymentIntent(pi, key),
    // Condicional desde «held»: un reintento nunca cobra ni avisa dos veces.
    async markCaptured(id, data) {
      const { count } = await prisma.payment.updateMany({ where: { id, status: "held" }, data: { status: "paid", paidAt: data.paidAt, amountCentavos: data.amountCentavos } });
      return count > 0;
    },
    async markReleased(id) {
      const { count } = await prisma.payment.updateMany({ where: { id, status: "held" }, data: { status: "released" } });
      return count > 0;
    },
    setRequestStatus,
    sendCustomer: m.send,
    sendTeam: m.team,
  };
}
