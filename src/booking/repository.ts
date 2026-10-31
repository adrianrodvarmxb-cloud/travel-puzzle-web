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
