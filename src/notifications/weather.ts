/**
 * Pronóstico del clima para la hora del tour, con MET Norway (api.met.no):
 * gratis, sin llave, uso comercial permitido con crédito (CC BY 4.0).
 * Cubre unos 9 días; si el tour es más lejano no hay pronóstico.
 */
export type WeatherKind = "sun" | "partly" | "cloud" | "rain" | "storm" | "snow" | "fog";

export interface Weather {
  kind: WeatherKind;
  /** Temperatura a la hora del tour (°C). */
  temp: number;
  /** Mínima y máxima del día del tour (°C). */
  min: number;
  max: number;
  /** Probabilidad de lluvia en esa hora (%), si viene. */
  rainChance: number | null;
}

interface Entry {
  time: string;
  data: {
    instant: { details: { air_temperature?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { probability_of_precipitation?: number } };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: { probability_of_precipitation?: number } };
  };
}

/** "partlycloudy_day" → "partly"; "heavyrainshowersandthunder" → "storm". */
export function weatherKind(symbol: string): WeatherKind {
  const s = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (s.includes("thunder")) return "storm";
  if (s.includes("snow") || s.includes("sleet")) return "snow";
  if (s.includes("rain")) return "rain";
  if (s === "fog") return "fog";
  if (s === "cloudy") return "cloud";
  if (s === "partlycloudy" || s === "fair") return s === "fair" ? "sun" : "partly";
  return "sun";
}

/** Diferencia horaria aproximada por longitud (basta para elegir la hora del pronóstico). */
export function approxUtcOffsetHours(lng: number): number {
  return Math.round(lng / 15);
}

/**
 * Elige del pronóstico la hora del tour y el rango del día.
 * eventDate: "2026-11-02 10:00:00" en hora local del tour.
 */
export function pickForecast(series: Entry[], eventDate: string, utcOffsetHours: number): Weather | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(eventDate);
  if (!m || !series.length) return null;
  const localMs = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const target = localMs - utcOffsetHours * 3_600_000;
  const dayStart = Date.UTC(+m[1], +m[2] - 1, +m[3]) - utcOffsetHours * 3_600_000;
  const dayEnd = dayStart + 86_400_000;

  let best: Entry | null = null;
  let bestGap = Infinity;
  const temps: number[] = [];
  for (const e of series) {
    const t = Date.parse(e.time);
    const temp = e.data.instant.details.air_temperature;
    if (t >= dayStart && t < dayEnd && typeof temp === "number") temps.push(temp);
    const gap = Math.abs(t - target);
    if (gap < bestGap) { bestGap = gap; best = e; }
  }
  // Más de 3 h de distancia: el tour cae fuera del pronóstico.
  if (!best || bestGap > 3 * 3_600_000) return null;
  const next = best.data.next_1_hours ?? best.data.next_6_hours;
  const symbol = next?.summary?.symbol_code;
  const temp = best.data.instant.details.air_temperature;
  if (!symbol || typeof temp !== "number") return null;
  const rain = next?.details?.probability_of_precipitation;
  return {
    kind: weatherKind(symbol),
    temp: Math.round(temp),
    min: Math.round(temps.length ? Math.min(...temps) : temp),
    max: Math.round(temps.length ? Math.max(...temps) : temp),
    rainChance: typeof rain === "number" ? Math.round(rain) : null,
  };
}

/** Consulta MET Norway. Nunca lanza: sin pronóstico, el correo sale igual. */
export async function getWeather(
  deps: { fetch: typeof fetch; userAgent: string },
  q: { lat: number; lng: number; eventDate: string }
): Promise<Weather | null> {
  try {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${q.lat.toFixed(4)}&lon=${q.lng.toFixed(4)}`;
    const res = await deps.fetch(url, { headers: { "User-Agent": deps.userAgent, Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { properties?: { timeseries?: Entry[] } };
    return pickForecast(json.properties?.timeseries ?? [], q.eventDate, approxUtcOffsetHours(q.lng));
  } catch {
    return null;
  }
}

/** "lat,lng" del punto de encuentro de Freetour. */
export function coordsOf(mp: unknown): { lat: number; lng: number } | null {
  const c = (mp as { coordinates?: unknown } | null)?.coordinates;
  if (typeof c !== "string") return null;
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(c);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}
