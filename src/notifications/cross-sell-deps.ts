/** Dependencias reales de la venta cruzada en correos (D1 y banderas). La lógica vive en cross-sell.ts y lib/. */
import { getPrisma } from "@/lib/prisma";
import { getTourSummary } from "@/booking/tour-summary";
import { loadTripCards } from "@/trips/public-load";
import { isBookingsEnabled } from "@/booking/lib/flags";
import type { CrossSellLoaderDeps } from "./cross-sell";
import { crossSellEnabled } from "./lib/cross-sell";
import { optOutChecker } from "./lib/opt-out";

export function crossSellDepsFromEnv(env: Record<string, string | undefined>): CrossSellLoaderDeps {
  return {
    enabled: crossSellEnabled(env),
    transfers: isBookingsEnabled(env.TRANSFERS_ENABLED),
    noPublicidad: optOutChecker(env.EMAIL_NO_PUBLICIDAD),
    tripCards: loadTripCards,
    async place(tourExternalId) {
      const prisma = getPrisma();
      const [summary, row] = await Promise.all([
        getTourSummary(prisma, tourExternalId, "es"),
        prisma.tour.findUnique({ where: { providerId_externalId: { providerId: 'freetour', externalId: tourExternalId } }, select: { city: { select: { slug: true } }, country: { select: { code: true, iso2: true } } } }),
      ]);
      const iso = (row?.country?.iso2 ?? row?.country?.code ?? "").toUpperCase();
      return { cityName: summary?.cityName ?? null, country: /^[A-Z]{2}$/.test(iso) ? iso : null, cityCode: row?.city?.slug ?? null };
    },
  };
}
