import type { PrismaClient, Prisma } from "@prisma/client";
import type { StoredTrip, TripsDeps } from "./manage";
import type { TripStatus } from "./lib/trip";
import { TP_INITIALS, suggestInitials } from "./lib/code";
import { availabilitySchema, cancellationSchema } from "./schemas/trip";

type Row = Prisma.TripGetPayload<object>;
const arr = <T>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

/** REQ-1344: también arma las tarjetas desde la fila ya leída (sin releer cada viaje). */
export const toTrip = (r: Row): StoredTrip => ({
  ...r,
  kind: r.kind as StoredTrip["kind"],
  purchaseMode: r.purchaseMode as StoredTrip["purchaseMode"],
  currency: r.currency as StoredTrip["currency"],
  category: r.category as StoredTrip["category"],
  difficulty: r.difficulty as StoredTrip["difficulty"],
  countries: arr<string>(r.countries),
  cities: arr<string>(r.cities),
  highlights: arr<string>(r.highlights),
  languages: arr<StoredTrip["languages"][number]>(r.languages),
  dates: arr<StoredTrip["dates"][number]>(r.dates),
  meetingPoints: arr<Partial<StoredTrip["meetingPoints"][number]>>(r.meetingPoints).map((p) => ({ name: p.name ?? "", address: p.address ?? "", lat: p.lat ?? null, lng: p.lng ?? null, instructions: p.instructions ?? "", photoKey: p.photoKey ?? null })),
  itinerary: arr<StoredTrip["itinerary"][number]>(r.itinerary),
  includes: arr<string>(r.includes),
  excludes: arr<string>(r.excludes),
  images: arr<StoredTrip["images"][number]>(r.images),
  options: arr<StoredTrip["options"][number]>(r.options),
  extras: arr<StoredTrip["extras"][number]>(r.extras),
  availability: availabilitySchema.parse(r.availability ?? {}),
  cancellation: cancellationSchema.parse(r.cancellation ?? {}),
});

/** Viajes y agencias en D1. */
export function createTripRepo(prisma: PrismaClient) {
  const deps: TripsDeps = {
    async findById(id) {
      const r = await prisma.trip.findUnique({ where: { id } });
      return r ? toTrip(r) : null;
    },
    async agencyInitials(agencyId) {
      if (!agencyId) return TP_INITIALS;
      const a = await prisma.agency.findUnique({ where: { id: agencyId }, select: { initials: true } });
      return a?.initials ?? "AG";
    },
    async nextSeq(initials) {
      const last = await prisma.trip.findFirst({ where: { code: { startsWith: `${initials}-` } }, orderBy: { seq: "desc" }, select: { seq: true } });
      return (last?.seq ?? 0) + 1;
    },
    async create(data) {
      const { translations: _t, ...rest } = data as typeof data & { translations?: unknown };
      return toTrip(await prisma.trip.create({ data: { ...rest, translations: {} } as Prisma.TripCreateInput }));
    },
    async update(id, data) {
      return toTrip(await prisma.trip.update({ where: { id }, data: data as Prisma.TripUpdateInput }));
    },
    async setStatus(id, status: TripStatus, lockCode) {
      await prisma.trip.update({ where: { id }, data: { status, ...(lockCode && { codeLocked: true }) } });
    },
  };
  return {
    ...deps,
    async list() {
      const rows = await prisma.trip.findMany({ orderBy: { updatedAt: "desc" }, include: { agency: { select: { name: true } } }, take: 500 });
      return rows.map(({ agency, ...r }) => ({ ...toTrip(r), agencyName: agency?.name ?? null, updatedAt: r.updatedAt }));
    },
    async listAgencies() {
      return prisma.agency.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, initials: true } });
    },
    /** Alta de agencia con siglas sugeridas (o las que se pidan, si están libres). */
    async createAgency(data: { name: string; contactName: string; email: string; phone: string; initials?: string }) {
      const taken = (await prisma.agency.findMany({ select: { initials: true } })).map((a) => a.initials ?? "").filter(Boolean);
      const wanted = data.initials?.toUpperCase();
      const initials = wanted && wanted !== TP_INITIALS && !taken.includes(wanted) ? wanted : suggestInitials(data.name, taken);
      const { initials: _w, ...rest } = data;
      return prisma.agency.create({ data: { ...rest, initials }, select: { id: true, name: true, initials: true } });
    },
  };
}
