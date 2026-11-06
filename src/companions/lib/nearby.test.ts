import { describe, expect, it } from "vitest";
import { coveredRequestEntries, nearbyExperiences, originPoint, tripPoint, NEARBY_RADII_KM, MAX_EXPERIENCES, type NearbyCandidate } from "./nearby";

const FX = { USD: 18.5, EUR: 20, date: "2026-11-05" };
const trip = (over: Partial<NearbyCandidate> & Pick<NearbyCandidate, "id">): NearbyCandidate => ({
  provider: "trip", kind: "tour", title: `Viaje ${over.id}`, path: `/viajes/x/${over.id}`, image: `https://img/${over.id}.jpg`,
  cities: [], countries: [], point: null, priceFrom: 50, currency: "USD", durationDays: 1, agencyName: null, ...over,
});

// Coordenadas reales de los puntos de encuentro (imports/*.json).
const CUSCO = { lat: -13.5166, lng: -71.9785 };
const LONDRES = { lat: 51.5007, lng: -0.1246 };
const MPIKA = { lat: -11.8343, lng: 31.4529 };

const catalog: NearbyCandidate[] = [
  trip({ id: "iw-cusco-city", title: "City Tour en Cusco", cities: ["Cusco"], countries: ["PE"], point: CUSCO, agencyName: "Inca World Peru" }),
  trip({ id: "iw-montana", title: "Montaña de Colores", cities: ["Cusco"], countries: ["PE"], point: { lat: -13.87, lng: -71.3 }, agencyName: "Inca World Peru", priceFrom: 35 }),
  trip({ id: "iw-circuito", kind: "circuito", title: "Perú clásico 8 días", cities: ["Lima", "Cusco"], countries: ["PE"], point: { lat: -12.12, lng: -77.03 }, agencyName: "Inca World Peru", durationDays: 8, priceFrom: 1200 }),
  trip({ id: "iw-lima", title: "City Tour Virreinal de Lima", cities: ["Lima"], countries: ["PE"], point: { lat: -12.1211, lng: -77.0297 }, agencyName: "Inca World Peru" }),
  trip({ id: "bb-londres", kind: "transporte", title: "Bus turístico hop-on hop-off en Londres", cities: ["Londres"], countries: ["GB"], point: LONDRES, agencyName: "Big Bus Tours", priceFrom: 52 }),
  trip({ id: "bb-paris", kind: "transporte", title: "Bus turístico hop-on hop-off en París", cities: ["París"], countries: ["FR"], point: { lat: 48.8584, lng: 2.2945 }, agencyName: "Big Bus Tours", currency: "EUR", priceFrom: 45 }),
  trip({ id: "bb-edimburgo", kind: "transporte", title: "Bus turístico en Edimburgo", cities: ["Edimburgo"], countries: ["GB"], point: { lat: 55.9533, lng: -3.1883 }, agencyName: "Big Bus Tours" }),
  // Tours de FREETOUR (de pago o gratis): nunca entran a la tarjeta (regla B3).
  { ...trip({ id: "ft-londres", title: "Free tour por Westminster", cities: ["Londres"], countries: ["GB"], point: LONDRES }), provider: "freetour" },
  { ...trip({ id: "ft-cusco-pago", title: "Tour de pago FREETOUR Cusco", cities: ["Cusco"], countries: ["PE"], point: CUSCO }), provider: "freetour" },
];

describe("Experiencias cercanas para la tarjeta de tour (REQ-320…322)", () => {
  it("REQ-320: Cusco → experiencias de Inca World de la misma ciudad, primero las de un día, máx. 3, con foto, nombre real, precio y ficha", () => {
    const r = nearbyExperiences({ origin: { cityName: "Cusco", country: "PE", point: CUSCO }, candidates: catalog, fx: FX });
    expect(r.tier).toBe("city");
    expect(r.items.map((i) => i.id)).toEqual(["iw-cusco-city", "iw-montana", "iw-circuito"]);
    expect(r.items.length).toBeLessThanOrEqual(MAX_EXPERIENCES);
    expect(r.items[0]).toMatchObject({ title: "City Tour en Cusco", image: "https://img/iw-cusco-city.jpg", path: "/viajes/x/iw-cusco-city", operator: "Inca World Peru", multiDay: false });
    expect(r.items[2].multiDay).toBe(true);
    // precio en su moneda con los pesos aproximados (REQ-112), calculado en el servidor
    expect(r.items[1].price).toBe("Desde USD $35 (aprox. MXN $648)");
  });

  it("REQ-320: Londres → Big Bus (misma ciudad), nunca el free tour de FREETOUR", () => {
    const r = nearbyExperiences({ origin: { cityName: "Londres", country: "GB", point: LONDRES }, candidates: catalog, fx: FX });
    expect(r.items.map((i) => i.id)).toEqual(["bb-londres"]);
    expect(r.items[0].operator).toBe("Big Bus Tours");
  });

  it("REQ-321: ciudad con FREETOUR y sin otros proveedores → la tarjeta no recibe ningún tour de FREETOUR", () => {
    const onlyFreetour = catalog.filter((c) => c.provider === "freetour");
    const r = nearbyExperiences({ origin: { cityName: "Londres", country: "GB", point: LONDRES }, candidates: onlyFreetour, fx: FX });
    expect(r).toEqual({ tier: null, items: [] });
    // aunque llegue con otro nombre de proveedor en mayúsculas
    const shouty = onlyFreetour.map((c) => ({ ...c, provider: "FreeTour" }));
    expect(nearbyExperiences({ origin: { cityName: "Londres", country: "GB", point: LONDRES }, candidates: shouty, fx: FX }).items).toEqual([]);
  });

  it("REQ-320: sin nada en la ciudad → mismo país; primero las de un día y, entre ellas, la más cercana", () => {
    const r = nearbyExperiences({ origin: { cityName: "Arequipa", country: "PE", point: { lat: -16.409, lng: -71.537 } }, candidates: catalog, fx: FX });
    expect(r.tier).toBe("country");
    // Montaña de Colores (~285 km) antes que Cusco (~325 km) y que Lima; el circuito de 8 días no entra en las 3.
    expect(r.items.map((i) => i.id)).toEqual(["iw-montana", "iw-cusco-city", "iw-lima"]);
  });

  it("REQ-320: sin nada en el país → por coordenadas a 300 km y luego a 800 km", () => {
    // Bruselas no tiene nada propio; París está a ~265 km, Londres a ~320 km.
    const bru = nearbyExperiences({ origin: { cityName: "Bruselas", country: "BE", point: { lat: 50.8503, lng: 4.3517 } }, candidates: catalog, fx: FX });
    expect(bru.tier).toBe("radius-300");
    expect(bru.items.map((i) => i.id)).toEqual(["bb-paris"]);
    // Ámsterdam: nada a 300 km; a 800 km, Londres (~358), París (~430) y Edimburgo (~660), del más cercano al más lejano.
    const ams = nearbyExperiences({ origin: { cityName: "Ámsterdam", country: "NL", point: { lat: 52.3676, lng: 4.9041 } }, candidates: catalog, fx: FX });
    expect(ams.tier).toBe("radius-800");
    expect(ams.items.map((i) => i.id)).toEqual(["bb-londres", "bb-paris", "bb-edimburgo"]);
    // Atenas: nada a 800 km → vacío.
    expect(nearbyExperiences({ origin: { cityName: "Atenas", country: "GR", point: { lat: 37.98, lng: 23.73 } }, candidates: catalog, fx: FX }).items).toEqual([]);
    expect(NEARBY_RADII_KM).toEqual([300, 800]);
  });

  it("REQ-320: Mpika (Zambia), sin nada cerca → vacío (la tarjeta cae al asesor o no se muestra)", () => {
    const r = nearbyExperiences({ origin: { cityName: "Mpika", country: "ZM", point: MPIKA }, candidates: catalog, fx: FX });
    expect(r).toEqual({ tier: null, items: [] });
    // sin coordenadas, tampoco inventa cercanía
    expect(nearbyExperiences({ origin: { cityName: "Mpika", country: "ZM", point: null }, candidates: catalog, fx: FX }).items).toEqual([]);
  });

  it("REQ-320: ciudad con acentos o mayúsculas distintas cuenta como la misma; sin precio dice «A cotizar»; sin tipo de cambio solo la moneda", () => {
    const r = nearbyExperiences({ origin: { cityName: "CUSCO ", country: "PE", point: null }, candidates: [trip({ id: "x", cities: ["Cusco"], countries: ["PE"], priceFrom: null })], fx: null });
    expect(r.items[0].price).toBe("A cotizar");
    const s = nearbyExperiences({ origin: { cityName: "París", country: "FR", point: null }, candidates: catalog, fx: null });
    expect(s.items[0].price).toBe("Desde EUR €45");
  });

  it("REQ-320: un viaje sin ficha o sin título no entra", () => {
    const bad = [trip({ id: "a", cities: ["Cusco"], countries: ["PE"], path: "" }), trip({ id: "b", cities: ["Cusco"], countries: ["PE"], title: " " })];
    expect(nearbyExperiences({ origin: { cityName: "Cusco", country: "PE", point: CUSCO }, candidates: bad, fx: FX }).items).toEqual([]);
  });
});

describe("Coordenadas (REQ-322)", () => {
  it("REQ-322: origen = punto de encuentro del tour reservado; descarta el relleno de Greenwich y usa la mediana de la ciudad", () => {
    expect(originPoint("-13.5166,-71.9785", [])).toEqual(CUSCO);
    expect(originPoint("51.478,0.0015", ["51.5007,-0.1246", "51.51,-0.13", "bad"])).toEqual({ lat: 51.50535, lng: -0.12730 });
    expect(originPoint(null, [])).toBeNull();
  });

  it("REQ-322: punto del viaje = mediana de las lat/lng de sus puntos de encuentro", () => {
    expect(tripPoint([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: null, lng: null }])).toEqual({ lat: 2, lng: 3 });
    expect(tripPoint([])).toBeNull();
  });
});

describe("Sin repetir proveedor (REQ-324)", () => {
  it("REQ-324: si la tarjeta de tour ya muestra Big Bus, la solicitud de Big Bus no se repite en otra tarjeta", () => {
    const entries = [{ id: "bigbus", adapter: "request", provider: "Big Bus" }, { id: "kiwitaxi", adapter: "kiwitaxi", provider: "Kiwitaxi" }];
    expect(coveredRequestEntries(entries, [{ operator: "Big Bus Tours" }])).toEqual(["bigbus"]);
    expect(coveredRequestEntries(entries, [{ operator: "Inca World Peru" }, { operator: null }])).toEqual([]);
  });
});
