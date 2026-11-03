/**
 * Reseñas de clientes de Travel Puzzle: guardar desde /reserva/[token]/resena, avisar a info@,
 * moderar con enlaces firmados y listar las publicadas. Recibe todo por parámetro (sin imports de I/O).
 */
import type { BookingRecord } from "@/booking/lib/booking-record";
import { TOKEN_PATTERN } from "@/booking/manage";
import { buildReviewAlertEmail } from "@/notifications/lib/review-alert-email";
import { canReview, reviewerDisplayName, signLink, verifyLink, LINK_TTL_MS, type ReviewStatus } from "./lib/customer-review";
import type { ReviewInput } from "./schemas/customer-review";

export interface StoredReview {
  id: string;
  refNumber: string;
  tourExternalId: number | null;
  rate: number;
  content: string;
  displayName: string;
  consent: boolean;
  status: string;
  language: string;
  tourDate: string | null;
}

export type ReviewDraft = Omit<StoredReview, "id" | "status">;

export interface CustomerReviewDeps {
  now: Date;
  /** Secreto para firmar los enlaces (se usa CRON_SECRET). */
  secret: string;
  siteUrl: string;
  findBooking(token: string): Promise<BookingRecord | null>;
  findReviewByRef(refNumber: string): Promise<StoredReview | null>;
  findReviewById(id: string): Promise<StoredReview | null>;
  /** Crea o actualiza la reseña de la reserva; siempre queda "pending". */
  saveReview(data: ReviewDraft): Promise<StoredReview>;
  setStatus(id: string, status: ReviewStatus): Promise<void>;
  tourTitle(tourExternalId: number | null): Promise<string | null>;
  /** Manda el aviso interno (a info@). */
  notify(email: { subject: string; html: string; text: string }): Promise<unknown>;
}

export type PageState =
  | { kind: "not_found" }
  | { kind: "not_allowed" }
  | { kind: "too_early"; record: BookingRecord }
  | { kind: "ready"; record: BookingRecord; existing: StoredReview | null };

/** Qué muestra la página de reseña para este enlace. */
export async function reviewPageState(token: string, d: CustomerReviewDeps): Promise<PageState> {
  if (!TOKEN_PATTERN.test(token)) return { kind: "not_found" };
  const record = await d.findBooking(token);
  if (!record) return { kind: "not_found" };
  if (record.status === "canceled" || record.status === "rejected") return { kind: "not_allowed" };
  if (!canReview(record, d.now)) return { kind: "too_early", record };
  return { kind: "ready", record, existing: await d.findReviewByRef(record.refNumber) };
}

const site = (d: CustomerReviewDeps) => d.siteUrl.replace(/\/+$/, "");

async function moderationUrl(d: CustomerReviewDeps, id: string, action: "publish" | "hide", exp: number) {
  const sig = await signLink(d.secret, `${action}:${id}`, exp);
  return `${site(d)}/resenas/moderar?id=${encodeURIComponent(id)}&a=${action}&exp=${exp}&sig=${sig}`;
}

/** Enlace firmado al panel /admin/resenas (vence en 7 días). */
export async function adminUrl(d: CustomerReviewDeps): Promise<string> {
  const exp = d.now.getTime() + LINK_TTL_MS;
  return `${site(d)}/admin/resenas?exp=${exp}&sig=${await signLink(d.secret, "admin", exp)}`;
}

export async function adminLinkValid(q: { exp: number; sig: string }, d: CustomerReviewDeps): Promise<boolean> {
  return verifyLink(d.secret, "admin", q.exp, q.sig, d.now);
}

/** Guarda (o edita) la reseña y avisa a info@. El aviso nunca rompe el guardado. */
export async function submitReview(input: ReviewInput, d: CustomerReviewDeps): Promise<"saved" | "not_found" | "not_allowed"> {
  const state = await reviewPageState(input.token, d);
  if (state.kind === "not_found") return "not_found";
  if (state.kind !== "ready") return "not_allowed";
  const { record } = state;
  const saved = await d.saveReview({
    refNumber: record.refNumber,
    tourExternalId: record.tourExternalId,
    rate: input.rate,
    content: input.content,
    displayName: reviewerDisplayName(record.firstName, record.lastName),
    consent: input.consent,
    language: record.language ?? "es",
    tourDate: record.eventDate,
  });
  try {
    const exp = d.now.getTime() + LINK_TTL_MS;
    const email = buildReviewAlertEmail({
      rate: saved.rate,
      content: saved.content,
      displayName: saved.displayName,
      consent: saved.consent,
      tourTitle: (await d.tourTitle(record.tourExternalId)) ?? `Tour ${record.tourExternalId ?? ""}`.trim(),
      refNumber: record.refNumber,
      customerName: `${record.firstName} ${record.lastName}`.trim(),
      customerEmail: record.email,
      customerPhone: record.phone,
      publishUrl: await moderationUrl(d, saved.id, "publish", exp),
      hideUrl: await moderationUrl(d, saved.id, "hide", exp),
      adminUrl: await adminUrl(d),
      logoUrl: `${site(d)}/brand/logo-tp-oscuro.png`,
    });
    await d.notify(email);
  } catch (error) {
    console.error(`[reseñas] no se envió el aviso de ${record.refNumber}:`, (error as Error).message);
  }
  return "saved";
}

export type ModerateResult = "published" | "hidden" | "invalid" | "not_found" | "no_consent";

/** Publica u oculta con un enlace firmado (correo o panel). Publicar exige consentimiento. */
export async function moderateReview(
  q: { id: string; action: "publish" | "hide"; exp: number; sig: string },
  d: CustomerReviewDeps
): Promise<ModerateResult> {
  const ok = (await verifyLink(d.secret, `${q.action}:${q.id}`, q.exp, q.sig, d.now)) || (await adminLinkValid(q, d));
  if (!ok) return "invalid";
  const review = await d.findReviewById(q.id);
  if (!review) return "not_found";
  if (q.action === "publish" && !review.consent) return "no_consent";
  await d.setStatus(q.id, q.action === "publish" ? "published" : "hidden");
  return q.action === "publish" ? "published" : "hidden";
}

/** Enlaces firmados para los botones de una reseña (los usa el panel). */
export async function moderationLinks(id: string, d: CustomerReviewDeps) {
  const exp = d.now.getTime() + LINK_TTL_MS;
  return { publish: await moderationUrl(d, id, "publish", exp), hide: await moderationUrl(d, id, "hide", exp) };
}
