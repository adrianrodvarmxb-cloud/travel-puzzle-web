/** Dependencias reales de las cuentas de cliente (D1 y Resend). REQ-1591…1594 y REQ-1599. */
import { getPrisma } from "@/lib/prisma";
import { ACCOUNTS_ENABLED } from "@/lib/features";
import { getTourSummary } from "@/booking/tour-summary";
import type { LoginDeps } from "./login";
import type { TourBookingRow, TripRequestRow } from "./lib/bookings";

const userSelect = { id: true, email: true, name: true, role: true, updatedAt: true } as const;

export async function loginDeps(): Promise<LoginDeps> {
  const { sendEmail } = await import("@/notifications/resend");
  const prisma = getPrisma();
  return {
    now: new Date(),
    secret: process.env.AUTH_SECRET ?? "",
    siteUrl: process.env.SITE_URL ?? "",
    accountsEnabled: ACCOUNTS_ENABLED,
    findUser: (email) => prisma.user.findUnique({ where: { email }, select: userSelect }),
    createUser: (email) => prisma.user.create({ data: { email, name: null, password: null, role: "CLIENT" }, select: userSelect }),
    touchUser: async (id) => { await prisma.user.update({ where: { id }, data: { updatedAt: new Date() } }); },
    send: (email) => sendEmail({ apiKey: process.env.RESEND_API_KEY ?? "", fetch }, { ...email, from: process.env.EMAIL_FROM ?? "", replyTo: process.env.EMAIL_REPLY_TO }),
  };
}

/** REQ-1593: reservas y solicitudes del correo de la sesión (sin distinguir mayúsculas). */
export async function loadAccountRows(email: string): Promise<{ tours: TourBookingRow[]; requests: TripRequestRow[] }> {
  const prisma = getPrisma();
  const e = email.trim().toLowerCase();
  if (!e) return { tours: [], requests: [] };
  // REQ-1593: la consulta cruda solo busca IDs sin distinguir mayúsculas; los campos se leen con Prisma (tipos correctos).
  const ids = await prisma.$queryRaw<Array<{ refNumber: string }>>`SELECT refNumber FROM FreetourBooking WHERE lower(email) = ${e} ORDER BY createdAt DESC LIMIT 200`;
  const raw = ids.length
    ? await prisma.freetourBooking.findMany({ where: { refNumber: { in: ids.map((r) => r.refNumber) } }, select: { refNumber: true, manageToken: true, tourExternalId: true, eventDate: true, status: true, paymentStatus: true, price: true, currency: true } })
    : [];
  const titles = new Map<number, string>();
  for (const r of raw) {
    if (r.tourExternalId && !titles.has(r.tourExternalId)) {
      const t = (await getTourSummary(prisma, r.tourExternalId, "es").catch(() => null))?.title;
      titles.set(r.tourExternalId, t ?? "Experiencia Travel Puzzle");
    }
  }
  const tours: TourBookingRow[] = raw.map((r) => ({
    refNumber: r.refNumber, manageToken: r.manageToken, title: r.tourExternalId ? titles.get(r.tourExternalId)! : "Experiencia Travel Puzzle",
    eventDate: r.eventDate, status: r.status, paymentStatus: r.paymentStatus, price: Number(r.price), currency: r.currency,
  }));
  const reqIds = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM TripRequest WHERE lower(email) = ${e} ORDER BY createdAt DESC LIMIT 200`;
  const requests: TripRequestRow[] = reqIds.length
    ? await prisma.tripRequest.findMany({ where: { id: { in: reqIds.map((r) => r.id) } }, select: { ref: true, tripTitle: true, date: true, status: true, createdAt: true } })
    : [];
  return { tours, requests };
}

/** REQ-1594 */
export async function updateAccountName(id: string, name: string) {
  await getPrisma().user.update({ where: { id }, data: { name } });
}
/** REQ-1594: borra la cuenta; las reservas viven por correo y no se tocan. */
export async function deleteAccount(id: string) {
  const prisma = getPrisma();
  const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!u || u.role !== "CLIENT") return false;
  await prisma.user.delete({ where: { id } });
  return true;
}
