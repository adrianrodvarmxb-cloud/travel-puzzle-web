/**
 * Carga de la disponibilidad por fecha de un tour de proveedor (REQ-3468).
 *
 * Esta es la capa de I/O del dominio: recibe TODAS sus dependencias por parámetro (DIP) —cómo pedir las
 * tarifas, la caché compartida, el día de hoy y dónde registrar un fallo—, así que se prueba sin red y sin
 * base. El cableado real (pasarela de Tangol, `cached`/`POLICY` de la caché de Cloudflare) vive en
 * `availability-deps.ts`, igual que `src/trips/cross-sell-deps.ts`.
 *
 * Reglas que cumple:
 * - Las tarifas de Tangol son UNA llamada por tour (`GetTourRates`): van siempre por la caché compartida.
 * - Si la llamada falla, la ficha NO se cae: devuelve `null` (ficha sin calendario) y registra el fallo.
 * - Nunca se inventa un precio: sin tarifas no hay calendario.
 */
import {
  availabilityFromDates,
  availabilityFromRanges,
  availabilityKind,
  buildCalendar,
  datesFromJson,
  minAdvanceDays,
  type ProviderCalendar,
  type RangeRates,
} from "./lib/provider-availability";

export interface AvailabilityDeps {
  /** Tarifas con rango del proveedor. `null` = no hay forma de pedirlas (bandera apagada o sin pasarela). */
  rangeRates: ((externalId: number) => Promise<RangeRates>) | null;
  /** Caché compartida: la misma llave no vuelve a cargar. */
  cached: <T>(key: string, load: () => Promise<T>) => Promise<T>;
  /** Día de hoy (AAAA-MM-DD), del servidor. */
  today: string;
  log: (donde: string, err: unknown) => void;
}

export interface ProviderTourRef {
  providerId: string;
  externalId: number;
  /** Fechas de salida ya guardadas en la base (proveedores de fechas sueltas): arreglo o texto JSON. */
  departureDates?: unknown;
  /** Precio público «desde» de la ficha, para los proveedores que no dan tarifa por fecha. */
  fromPrice?: { adult: number; currency: string | null } | null;
}

/** Llave de la caché: una por tour y proveedor (las tarifas no dependen del mes que se pinte). */
// REQ-3468
export function ratesCacheKey(tour: ProviderTourRef): string {
  return `rates:${tour.providerId}:${tour.externalId}:v1`;
}

/**
 * Calendario de los próximos `months` meses del tour, o `null` si no se puede saber (REQ-3470).
 */
// REQ-3468, REQ-3470
export async function loadProviderAvailability(
  tour: ProviderTourRef,
  opts: { months?: number },
  deps: AvailabilityDeps,
): Promise<ProviderCalendar | null> {
  const months = opts.months ?? 6;

  if (availabilityKind(tour.providerId) === "ranges") {
    if (!deps.rangeRates) return null; // bandera apagada: ni se intenta
    const pedir = deps.rangeRates;
    let rates: RangeRates;
    try {
      rates = await deps.cached(ratesCacheKey(tour), () => pedir(tour.externalId));
    } catch (e) {
      // Regla 7 del blindaje: la sección se oculta, la ficha sigue de pie.
      deps.log(`[disponibilidad] tarifas de ${tour.providerId} ${tour.externalId}`, e);
      return null;
    }
    return buildCalendar(availabilityFromRanges(rates), {
      today: deps.today,
      months,
      minDays: minAdvanceDays(rates.hoursBooking),
      currency: rates.currency,
    });
  }

  const dates = datesFromJson(tour.departureDates);
  if (!dates.length || !tour.fromPrice) return null;
  return buildCalendar(availabilityFromDates({ dates, adult: tour.fromPrice.adult, currency: tour.fromPrice.currency }), {
    today: deps.today,
    months,
    currency: tour.fromPrice.currency,
  });
}
