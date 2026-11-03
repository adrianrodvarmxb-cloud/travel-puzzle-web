import type { PrismaClient, Prisma } from "@prisma/client";
import type { StoredTrip, TripsDeps } from "./manage";
import type { TripStatus } from "./lib/trip";

type Row = Prisma.TripGetPayload<object>;

const toTrip = (r: Row): StoredTrip => ({
  ...r,
  kind: r.kind as StoredTrip["kind"],
  purchaseMode: r.purchaseMode as StoredTrip["purchaseMode"],
  currency: r.currency as StoredTrip["currency"],
  countries: r.countries as string[],
  cities: r.cities as string[],
  dates: r.dates as StoredTrip["dates"],
  meetingPoints: r.meetingPoints as StoredTrip["meetingPoints"],
  itinerary: r.itinerary as StoredTrip["itinerary"],
  includes: r.includes as string[],
  excludes: r.excludes as string[],
  images: r.images as StoredTrip["images"],
});

/** Viajes y agencias en D1. */
export function createTripRepo(prisma: PrismaClient): TripsDeps & {
  list(): Promise<(StoredTrip & { agencyName: string | null; updatedAt: Date })[]>;
  listAgencies(): Promise<{ id: string; name: string }[]>;
  createAgency(data: { name: string; contactName: string; email: string; phone: string }): Promise<{ id: string; name: string }>;
} {
  return {
    async findById(id) {
      const r = await prisma.trip.findUnique({ where: { id } });
      return r ? toTrip(r) : null;
    },
    async findByCode(code) {
      const r = await prisma.trip.findUnique({ where: { code } });
      return r ? toTrip(r) : null;
    },
    async create(data) {
      return toTrip(await prisma.trip.create({ data }));
    },
    async update(id, data) {
      return toTrip(await prisma.trip.update({ where: { id }, data }));
    },
    async setStatus(id, status: TripStatus) {
      await prisma.trip.update({ where: { id }, data: { status } });
    },
    async list() {
      const rows = await prisma.trip.findMany({ orderBy: { updatedAt: "desc" }, include: { agency: { select: { name: true } } }, take: 500 });
      return rows.map(({ agency, ...r }) => ({ ...toTrip(r), agencyName: agency?.name ?? null, updatedAt: r.updatedAt }));
    },
    async listAgencies() {
      return prisma.agency.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    },
    async createAgency(data) {
      return prisma.agency.create({ data, select: { id: true, name: true } });
    },
  };
}
