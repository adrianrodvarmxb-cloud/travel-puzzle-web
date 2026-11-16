// Ficha única, ola 4 «Geografía» (decisiones 27, 28 y 30 del PO, 14 nov 2026).
// npx vitest run src/map/lib/city-pin.test.ts
import { describe, expect, it } from "vitest";
import {
  ZONE_RADIUS_M,
  cityLatLng,
  cityPinFallbackEnabled,
  cityPointsWithFallback,
  fichaMapView,
  sinCoordenadasPorProveedor,
  tourPin,
  zoneMapEnabled,
} from "./city-pin";

const ON = { CITY_PIN_FALLBACK_ENABLED: "true", ZONE_MAP_ENABLED: "true" };
const OFF = { CITY_PIN_FALLBACK_ENABLED: "false", ZONE_MAP_ENABLED: "false" };
const bariloche = { lat: -41.1335, lng: -71.3103 };
const punto = { lat: -41.1301, lng: -71.3105 };

describe("REQ-10737: banderas de la ola 4, apagadas por omisión", () => {
  it("REQ-10737: solo el texto \"true\" encaja; vacío, ausente o cualquier otro valor apaga", () => {
    expect(cityPinFallbackEnabled(ON)).toBe(true);
    expect(zoneMapEnabled(ON)).toBe(true);
    expect(cityPinFallbackEnabled(OFF)).toBe(false);
    expect(zoneMapEnabled(OFF)).toBe(false);
    expect(cityPinFallbackEnabled({})).toBe(false);
    expect(zoneMapEnabled({ ZONE_MAP_ENABLED: "TRUE" })).toBe(false);
    expect(cityPinFallbackEnabled({ CITY_PIN_FALLBACK_ENABLED: "1" })).toBe(false);
  });
});

describe("REQ-10734: coordenadas de ciudad (columnas lat/lng de la migración 0035)", () => {
  it("REQ-10734: lee lat/lng en rango; NULL, fuera de rango o 0,0 cuentan como sin coordenadas", () => {
    expect(cityLatLng(bariloche)).toEqual(bariloche);
    expect(cityLatLng({ lat: null, lng: null })).toBeNull();
    expect(cityLatLng({ lat: -41.1, lng: undefined })).toBeNull();
    expect(cityLatLng({ lat: 0, lng: 0 })).toBeNull();
    expect(cityLatLng({ lat: 95, lng: 10 })).toBeNull();
    expect(cityLatLng({ lat: 10, lng: -190 })).toBeNull();
    expect(cityLatLng({ lat: Number.NaN, lng: 1 })).toBeNull();
    expect(cityLatLng(null)).toBeNull();
    expect(cityLatLng(undefined)).toBeNull();
  });
});

describe("REQ-10735: pin de respaldo por coordenadas de ciudad (decisión 27)", () => {
  it("REQ-10735: con punto exacto, el pin es el punto, con o sin bandera", () => {
    expect(tourPin(punto, bariloche, ON)).toEqual({ ...punto, exact: true });
    expect(tourPin(punto, null, OFF)).toEqual({ ...punto, exact: true });
  });

  it("REQ-10735: sin punto y con la bandera, el pin es la ciudad y se marca como respaldo", () => {
    expect(tourPin(null, bariloche, ON)).toEqual({ ...bariloche, exact: false });
  });

  it("REQ-10735: sin punto y sin coordenadas de ciudad no hay pin; con la bandera apagada tampoco", () => {
    expect(tourPin(null, { lat: null, lng: null }, ON)).toBeNull();
    expect(tourPin(null, null, ON)).toBeNull();
    expect(tourPin(null, bariloche, OFF)).toBeNull();
    expect(tourPin(undefined, bariloche, OFF)).toBeNull();
  });

  it("REQ-10735: el mapa por ciudad conserva la mediana de hoy y suma las ciudades sin puntos en sus coordenadas", () => {
    const rows = [
      { cityId: 1, coords: "-41.1301,-71.3105" },
      { cityId: 1, coords: "-41.1333,-71.3100" },
      { cityId: 1, coords: null },
      { cityId: 2, coords: null },
      { cityId: 2, coords: "" },
      { cityId: 3, coords: null },
    ];
    const cities = new Map([
      [2, { lat: -34.6037, lng: -58.3816 }],
      [3, { lat: null, lng: null }],
    ]);
    const out = cityPointsWithFallback(rows, cities, ON);
    expect(out).toEqual([
      { cityId: 1, lat: -41.1317, lng: -71.31025, tours: 3, fallback: false },
      { cityId: 2, lat: -34.6037, lng: -58.3816, tours: 2, fallback: true },
    ]);
  });

  it("REQ-10735: con la bandera apagada el mapa por ciudad es exactamente el de hoy (sin ciudades de respaldo)", () => {
    const rows = [
      { cityId: 1, coords: "-41.1301,-71.3105" },
      { cityId: 2, coords: null },
    ];
    const cities = new Map([[2, { lat: -34.6037, lng: -58.3816 }]]);
    expect(cityPointsWithFallback(rows, cities, OFF)).toEqual([{ cityId: 1, lat: -41.1301, lng: -71.3105, tours: 1, fallback: false }]);
  });
});

describe("REQ-10736: «Zona aproximada» en la ficha sin punto exacto (decisión 28)", () => {
  it("REQ-10736: con punto exacto, mapa de hoy con «Cómo llegar»", () => {
    expect(fichaMapView(punto, bariloche, ON)).toEqual({ kind: "exact", ...punto, directions: true });
    expect(fichaMapView(punto, null, OFF)).toEqual({ kind: "exact", ...punto, directions: true });
  });

  it("REQ-10736: sin punto y con la bandera, círculo en el centro de la ciudad y sin botón", () => {
    expect(fichaMapView(null, bariloche, ON)).toEqual({ kind: "zone", ...bariloche, radiusM: ZONE_RADIUS_M, directions: false });
    expect(fichaMapView(null, bariloche, ON, 800)).toMatchObject({ kind: "zone", radiusM: 800 });
  });

  it("REQ-10736: sin punto y sin coordenadas de ciudad, o con la bandera apagada, la ficha no pinta mapa (nunca un centro por omisión)", () => {
    expect(fichaMapView(null, { lat: null, lng: null }, ON)).toBeNull();
    expect(fichaMapView(null, bariloche, OFF)).toBeNull();
    expect(fichaMapView(undefined, undefined, ON)).toBeNull();
  });
});

describe("REQ-10738: medición de tours sin coordenadas por proveedor (decisión 30, FREETOUR primero)", () => {
  it("REQ-10738: cuenta vacíos, inválidos y 0,0 como sin coordenadas y dice cuántos ya tienen ciudad con coordenadas", () => {
    const rows = [
      { providerId: "freetour", cityId: 1, coords: "51.5074,-0.1278" },
      { providerId: "freetour", cityId: 1, coords: null },
      { providerId: "freetour", cityId: 1, coords: "" },
      { providerId: "freetour", cityId: 2, coords: "0,0" },
      { providerId: "freetour", cityId: 3, coords: "abc" },
      { providerId: "tangol", cityId: 4, coords: null },
      { providerId: "tangol", cityId: 4, coords: "-41.1301,-71.3105" },
      { providerId: "big-bus-tours", cityId: 5, coords: "40.4168,-3.7038" },
    ];
    const cities = new Map([
      [1, { lat: 51.5074, lng: -0.1278 }],
      [2, { lat: null, lng: null }],
      [4, { lat: -41.1335, lng: -71.3103 }],
    ]);
    expect(sinCoordenadasPorProveedor(rows, cities)).toEqual([
      { providerId: "freetour", total: 5, sinCoordenadas: 4, conCiudad: 2 },
      { providerId: "tangol", total: 2, sinCoordenadas: 1, conCiudad: 1 },
      { providerId: "big-bus-tours", total: 1, sinCoordenadas: 0, conCiudad: 0 },
    ]);
  });

  it("REQ-10738: sin tabla de ciudades, conCiudad es 0 y el conteo sigue", () => {
    expect(sinCoordenadasPorProveedor([{ providerId: "freetour", cityId: 1, coords: null }])).toEqual([
      { providerId: "freetour", total: 1, sinCoordenadas: 1, conCiudad: 0 },
    ]);
    expect(sinCoordenadasPorProveedor([])).toEqual([]);
  });
});
