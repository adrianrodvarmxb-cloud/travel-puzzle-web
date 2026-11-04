import type { PrismaClient } from "@prisma/client";
import type { BookingRecord } from "./lib/booking-record";

/** Reservas guardadas en D1 (tabla FreetourBooking). */
export function createBookingRepo(prisma: PrismaClient) {
  return {
    async save(record: BookingRecord) {
      await prisma.freetourBooking.create({ data: record });
    },
    async findByToken(manageToken: string) {
      return prisma.freetourBooking.findUnique({ where: { manageToken } });
    },
    async findByRef(refNumber: string) {
      return prisma.freetourBooking.findUnique({ where: { refNumber } });
    },
    /** Reservas del horario con ese correo (el correo se guarda en minúsculas). */
    async findByEventAndEmail(eventId: number, email: string) {
      return prisma.freetourBooking.findMany({ where: { eventId, email }, select: { eventId: true, email: true, status: true }, take: 20 });
    },
    /** Nueva fecha/personas tras modificar la reserva. */
    async update(refNumber: string, data: Pick<BookingRecord, "eventId" | "adults" | "children" | "eventDate" | "eventUtcDate" | "language">) {
      await prisma.freetourBooking.update({ where: { refNumber }, data });
    },
    // REQ-011/012: datos del checkout de Freetour.
    async savePayment(refNumber: string, p: { checkoutSessionId: string; paymentUrl: string; paymentStatus: string; paymentExpiresAt: string; fullPrice?: number; currency?: string }) {
      await prisma.freetourBooking.update({ where: { refNumber }, data: { ...p, status: "pending_payment" } });
    },
    async findPaymentByToken(manageToken: string) {
      return prisma.freetourBooking.findUnique({ where: { manageToken }, select: { refNumber: true, manageToken: true, checkoutSessionId: true, paymentStatus: true, paymentExpiresAt: true, paymentCheckedAt: true } });
    },
    /** Pagado → la reserva queda activa (recordatorios, reseña); cancelado/vencido → cancelada. */
    async markPayment(refNumber: string, outcome: string, now: Date) {
      const status = outcome === "paid" ? { status: "active" } : outcome === "canceled" || outcome === "expired" ? { status: "canceled" } : {};
      await prisma.freetourBooking.update({ where: { refNumber }, data: { paymentStatus: outcome, paymentCheckedAt: now.toISOString(), ...status } });
    },
    async listPendingPayments() {
      return prisma.freetourBooking.findMany({ where: { paymentStatus: "pending" }, select: { refNumber: true, manageToken: true, checkoutSessionId: true, paymentStatus: true, paymentExpiresAt: true, paymentCheckedAt: true }, take: 100 });
    },
    async setStatus(refNumber: string, status: string) {
      await prisma.freetourBooking.update({ where: { refNumber }, data: { status } });
    },
    /** Reservas activas con el tour entre dos instantes ("YYYY-MM-DD HH:MM:SS" UTC). */
    async listActiveBetween(fromUtc: string, toUtc: string) {
      return prisma.freetourBooking.findMany({
        where: { status: "active", eventUtcDate: { gte: fromUtc, lte: toUtc } },
        orderBy: { eventUtcDate: "asc" },
        take: 200,
      });
    },
    /** "ref|kind" de los correos automáticos ya enviados. */
    async sentKinds(refNumbers: string[]) {
      if (!refNumbers.length) return new Set<string>();
      const rows = await prisma.freetourBookingEmail.findMany({ where: { refNumber: { in: refNumbers } }, select: { refNumber: true, kind: true } });
      return new Set(rows.map((r) => `${r.refNumber}|${r.kind}`));
    },
    async markSent(refNumber: string, kind: string) {
      await prisma.freetourBookingEmail.upsert({ where: { refNumber_kind: { refNumber, kind } }, create: { refNumber, kind }, update: {} });
    },
  };
}
