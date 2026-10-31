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
  };
}
