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
  };
}
