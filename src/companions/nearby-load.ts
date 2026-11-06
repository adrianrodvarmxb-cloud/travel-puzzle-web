/**
 * REQ-320 / REQ-322: lee de la base lo que necesita la tarjeta de tour de «Arma tu viaje»:
 * - los viajes publicados del gestor (propios y de agencias, incluye Big Bus), con el punto de sus puntos de encuentro;
 * - el punto de origen: el punto de encuentro del tour reservado o, si falta, la mediana de su ciudad.
 * Nunca lee tours de FREETOUR como candidatos (regla B3). Solo lectura; la base se inyecta. Si falla, lista vacía
 * (la tarjeta cae al asesor) y se registra; nunca rompe la página.
 */
import { z } from "zod";
import { tripPath } from "@/trips/lib/public";
import { imageUrl } from "@/trips/lib/image";
import { isKindVisible, type Visibility } from "@/trips/lib/visibility";
import { originPoint, tripPoint, type NearbyCandidate } from "./lib/nearby";
import type { Point } from "@/geo/lib/centroid";

export interface NearbyDb {
  trip: {
    findMany(args: {
      where: { status: "published" };
      select: {
        id: true; slug: true; kind: true; titleEs: true; countries: true; cities: true; priceFrom: true; currency: true;
        images: true; meetingPoints: true; durationDays: true; agency: { select: { name: true } };
      };
      take: number;
    }): Promise<unknown[]>;
  };
  tour: {
    findUnique(args: { where: { externalId: number }; select: { cityId: true; meetingPoint: true } }): Promise<{ cityId: number; meetingPoint: unknown } | null>;
    findMany(args: { where: { cityId: number; isActive: true }; select: { meetingPoint: true }; take: number }): Promise<{ meetingPoint: unknown }[]>;
  };
}

const zStrings = z.array(z.unknown()).catch([]).transform((a) => a.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()));
const zRow = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  kind: z.string().min(1),
  titleEs: z.string().trim().min(1),
  countries: zStrings,
  cities: zStrings,
  priceFrom: z.number().nullable().catch(null),
  currency: z.enum(["MXN", "USD", "EUR"]).catch("USD"),
  images: z.array(z.object({ key: z.string().min(1) }).passthrough()).catch([]),
  meetingPoints: z.array(z.object({ lat: z.number().nullable().catch(null), lng: z.number().nullable().catch(null) }).passthrough()).catch([]),
  durationDays: z.number().int().nullable().catch(null),
  agency: z.object({ name: z.string() }).nullable().catch(null),
});

const coordsOf = (mp: unknown): string | null => {
  const o = typeof mp === "string" ? (() => { try { return JSON.parse(mp); } catch { return null; } })() : mp;
  const c = o && typeof o === "object" ? (o as { coordinates?: unknown }).coordinates : null;
  return typeof c === "string" ? c : null;
};

// REQ-320: viajes publicados y visibles; un registro malo se descarta y se registra (no tumba la página).
export async function loadNearbyCandidates(db: NearbyDb, vis: Visibility): Promise<NearbyCandidate[]> {
  try {
    const rows = await db.trip.findMany({
      where: { status: "published" },
      select: { id: true, slug: true, kind: true, titleEs: true, countries: true, cities: true, priceFrom: true, currency: true, images: true, meetingPoints: true, durationDays: true, agency: { select: { name: true } } },
      take: 500,
    });
    return rows.flatMap((raw) => {
      const r = zRow.safeParse(raw);
      if (!r.success) {
        console.error("[arma-tu-viaje] viaje descartado en cercanía:", (raw as { id?: string })?.id ?? "?", r.error.issues[0]?.message);
        return [];
      }
      const t = r.data;
      if (!isKindVisible(t.kind, vis)) return [];
      return [{
        provider: "trip", id: t.id, kind: t.kind, title: t.titleEs, path: tripPath({ slug: t.slug, countries: t.countries }),
        image: t.images[0] ? imageUrl(t.images[0].key) : null, cities: t.cities, countries: t.countries.map((c) => c.toUpperCase()),
        point: tripPoint(t.meetingPoints), priceFrom: t.priceFrom, currency: t.currency, durationDays: t.durationDays, agencyName: t.agency?.name ?? null,
      }];
    });
  } catch (error) {
    console.error("[arma-tu-viaje] no se leyeron los viajes cercanos:", (error as Error).message);
    return [];
  }
}

// REQ-322
export async function loadOriginPoint(db: NearbyDb, tourExternalId: number | null | undefined): Promise<Point | null> {
  if (!tourExternalId) return null;
  try {
    const tour = await db.tour.findUnique({ where: { externalId: tourExternalId }, select: { cityId: true, meetingPoint: true } });
    if (!tour) return null;
    const own = originPoint(coordsOf(tour.meetingPoint), []);
    if (own) return own;
    const city = await db.tour.findMany({ where: { cityId: tour.cityId, isActive: true }, select: { meetingPoint: true }, take: 200 });
    return originPoint(null, city.map((c) => coordsOf(c.meetingPoint)));
  } catch (error) {
    console.error("[arma-tu-viaje] no se leyó el punto de origen:", (error as Error).message);
    return null;
  }
}
