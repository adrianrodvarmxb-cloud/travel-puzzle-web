import { describe, it, expect, vi } from "vitest";
import { weatherKind, pickForecast, getWeather, coordsOf, approxUtcOffsetHours } from "./weather";

const entry = (time: string, temp: number, symbol: string, rain?: number) => ({
  time,
  data: { instant: { details: { air_temperature: temp } }, next_1_hours: { summary: { symbol_code: symbol }, details: { probability_of_precipitation: rain } } },
});

// Mazatlán (UTC-7 aprox. por longitud -106)
const series = [
  entry("2026-11-02T13:00:00Z", 21.2, "fair_day"),
  entry("2026-11-02T17:00:00Z", 27.6, "clearsky_day", 0),
  entry("2026-11-02T22:00:00Z", 30.4, "partlycloudy_day"),
  entry("2026-11-03T12:00:00Z", 19, "rain"),
];

describe("clima", () => {
  it("traduce los símbolos de MET Norway", () => {
    expect(weatherKind("clearsky_day")).toBe("sun");
    expect(weatherKind("partlycloudy_night")).toBe("partly");
    expect(weatherKind("lightrainshowers_day")).toBe("rain");
    expect(weatherKind("heavyrainshowersandthunder")).toBe("storm");
    expect(weatherKind("cloudy")).toBe("cloud");
  });
  it("elige la hora del tour y el rango del día", () => {
    expect(approxUtcOffsetHours(-106.4)).toBe(-7);
    const w = pickForecast(series, "2026-11-02 10:00:00", -7)!;
    expect(w).toEqual({ kind: "sun", temp: 28, min: 21, max: 30, rainChance: 0 });
  });
  it("sin pronóstico cercano a la hora del tour, no inventa", () => {
    expect(pickForecast(series, "2026-11-20 10:00:00", -7)).toBeNull();
  });
  it("llama a MET Norway con User-Agent y no lanza si falla", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ properties: { timeseries: series } })));
    const w = await getWeather({ fetch, userAgent: "TravelPuzzle/1.0 info@travelpuzzle.com.mx" }, { lat: 23.2, lng: -106.4, eventDate: "2026-11-02 10:00:00" });
    expect(w?.temp).toBe(28);
    expect(fetch.mock.calls[0][0]).toContain("api.met.no");
    expect(fetch.mock.calls[0][1].headers["User-Agent"]).toContain("TravelPuzzle");
    const broken = vi.fn().mockRejectedValue(new Error("red"));
    expect(await getWeather({ fetch: broken, userAgent: "x" }, { lat: 1, lng: 1, eventDate: "2026-11-02 10:00:00" })).toBeNull();
  });
  it("lee las coordenadas del punto de encuentro", () => {
    expect(coordsOf({ coordinates: "23.2, -106.4" })).toEqual({ lat: 23.2, lng: -106.4 });
    expect(coordsOf({ coordinates: "x" })).toBeNull();
    expect(coordsOf(null)).toBeNull();
  });
});
