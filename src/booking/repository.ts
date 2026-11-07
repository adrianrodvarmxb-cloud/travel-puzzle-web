import type { PrismaClient } from "@prisma/client";
import type { BookingRecord } from "./lib/booking-record";

// REQ-931/932: lo que necesita el cobro para reutilizar el enlace, saber si el tour empezó y cancelar con 4 campos.
const PAYMENT_SELECT = {
  refNumber: true, manageToken: true, checkoutSessionId: true, paymentStatus: true, paymentExpiresAt: true, paymentCheckedAt: true,
  paymentUrl: true, eventUtcDate: true, eventId: true, adults: true, children: true, status: true,
} as const;

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
    // REQ-938 (D7): pago a la llegada: sin checkout; se guarda el total del grupo para los correos.
    async markArrival(refNumber: string, fullPrice: number) {
      await prisma.freetourBooking.update({ where: { refNumber }, data: { fullPrice, currency: "EUR", paymentStatus: "arrival" } });
    },
    async findPaymentByToken(manageToken: string) {
      return prisma.freetourBooking.findUnique({ where: { manageToken }, select: PAYMENT_SELECT });
    },
    /** Pagado → la reserva queda activa (recordatorios, reseña); cancelado/vencido → cancelada; REQ-932: vencida que el equipo cancela a mano → cancel_requested. */
    async markPayment(refNumber: string, outcome: string, now: Date) {
      const status = outcome === "paid" ? { status: "active" } : outcome === "canceled" || outcome === "expired" ? { status: "canceled" } : outcome === "expired_manual" ? { status: "cancel_requested" } : {};
      await prisma.freetourBooking.update({ where: { refNumber }, data: { paymentStatus: outcome, paymentCheckedAt: now.toISOString(), ...status } });
    },
    async listPendingPayments() {
      return prisma.freetourBooking.findMany({ where: { paymentStatus: "pending" }, select: PAYMENT_SELECT, take: 100 });
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
