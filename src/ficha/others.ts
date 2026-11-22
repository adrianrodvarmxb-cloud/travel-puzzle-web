/**
 * REQ-10862 · Fuente de «Otras experiencias en la ciudad» (bloque 20 de la ficha única; raíz del dominio: orquesta, no
 * calcula). Pide a la base, por separado, las experiencias de pago y las gratis de la misma ciudad (las más reseñadas
 * primero, hasta `OTHERS_POOL` de cada lado para que el tope por proveedor de REQ-10847 tenga de dónde escoger) y las
 * convierte en tarjetas con `otherCardsFrom`. Con `includePaid` apagado no consulta las de pago (REQ-014: no se recomienda
 * lo que no se puede reservar). Recibe la base por parámetro (DIP); nunca importa Prisma ni lee `process.env` aquí.
 * Si la base falla, el error sube: la página deja el bloque fuera y sigue (regla 7).
 */
import type { FxRates } from "@/trips/lib/money";
import type { OtherCard } from "./lib/cross-sell-view";
import type { FichaLang } from "./lib/model";
import { otherCardsFrom, type OtherTourRow } from "./lib/others-input";

/** Filas por lado (de pago y gratis). Con 3 tarjetas y tope de 2 por proveedor, 12 alcanzan para variar. */
export const OTHERS_POOL = 12;

export interface OthersDeps {
  /** Tours publicados de la ciudad, de pago (`paid`) o gratis, sin `excludeId`, más reseñados primero. */
  toursInCity(q: { cityId: number; excludeId: string; paid: boolean; take: number }): Promise<OtherTourRow[]>;
}

export interface OthersQuery {
  cityId: number;
  /** La propia ficha, que nunca sale. */
  excludeId: string;
  lang: FichaLang;
  /** `paidInRecommendations(env)`: solo con PAID_TOURS_ENABLED y PAID_TOURS_IN_RECOMMENDATIONS encendidas. */
  includePaid: boolean;
  rates: FxRates | null;
}

export interface OthersResult { paid: OtherCard[]; free: OtherCard[]; includePaid: boolean }

// REQ-10862
export async function loadOtherExperiences(deps: OthersDeps, q: OthersQuery): Promise<OthersResult> {
  const base = { cityId: q.cityId, excludeId: q.excludeId, take: OTHERS_POOL };
  const [paidRows, freeRows] = await Promise.all([
    q.includePaid ? deps.toursInCity({ ...base, paid: true }) : Promise.resolve([] as OtherTourRow[]),
    deps.toursInCity({ ...base, paid: false }),
  ]);
  const paid = otherCardsFrom(paidRows, { lang: q.lang, excludeId: q.excludeId, rates: q.rates }).paid;
  const free = otherCardsFrom(freeRows, { lang: q.lang, excludeId: q.excludeId, rates: q.rates }).free;
  return { paid, free, includePaid: q.includePaid };
}

/** Dependencia real: D1 por el Prisma público (el filtro de proveedores tras bandera ya viene puesto, REQ-3311). */
// REQ-10862
export async function otherExperiencesDeps(): Promise<OthersDeps> {
  const { getPrisma } = await import("@/lib/prisma");
  return {
    toursInCity: async ({ cityId, excludeId, paid, take }) => {
      const rows = await getPrisma().tour.findMany({
        where: { cityId, isActive: true, id: { not: excludeId }, titleImageURL: { startsWith: "https://" }, priceValue: paid ? { gt: 0 } : 0 },
        orderBy: [{ reviewsNumber: "desc" }],
        take,
        select: {
          id: true, slug: true, providerId: true, priceValue: true, priceCurrency: true, titleImageURL: true, reviewsNumber: true,
          translations: { select: { language: true, title: true } },
          city: { select: { slug: true } },
          country: { select: { iso2: true } },
        },
      });
      // Decimal → número, como el resto de la ficha.
      return rows.map((r) => ({ ...r, priceValue: Number(r.priceValue) })) as OtherTourRow[];
    },
  };
}
