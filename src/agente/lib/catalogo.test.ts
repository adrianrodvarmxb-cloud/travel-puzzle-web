// REQ-148..REQ-152 (PO, 5 nov 2026): catálogo de Travel Puzzle para el agente de WhatsApp (gates G1 A, G2 C, G3 C).
// npx vitest run src/agente/lib/catalogo.test.ts
import { describe, it, expect } from "vitest";
import { proveedorDe, buscarViajes, enlacePrellenado, leerPrellenado, autorizado, listaProveedores, FREETOUR, revisarFecha, type ViajeAgente } from "./catalogo";

const v = (o: Partial<ViajeAgente>): ViajeAgente => ({ slug: "x", path: "/viajes/mexico/x", title: "Tour", summary: "", places: "México", cities: [], kind: "tour",
  agencyId: null, price: "$1,000 MXN", durationDays: 1, dates: [], ...o });
const CAT = [
  v({ slug: "barrancas", title: "Barrancas del Cobre en tren", cities: ["Chihuahua", "Creel"], places: "México", dates: ["2026-11-20", "2026-11-27"] }),
  v({ slug: "oaxaca", title: "Oaxaca mágico", summary: "Monte Albán y Hierve el Agua", cities: ["Oaxaca"], agencyId: "ag-iwp" }),
  v({ slug: "cusco", title: "Machu Picchu desde Cusco", cities: ["Cusco"], places: "Perú", agencyId: "ag-otra" }),
];

describe("REQ-148: proveedores con su interruptor; FREETOUR bloqueado (gate G1 A)", () => {
  it("REQ-148: cada viaje es de Travel Puzzle (propios) o de su agencia", () => {
    expect(proveedorDe(CAT[0])).toBe("propios");
    expect(proveedorDe(CAT[1])).toBe("agencia:ag-iwp");
  });
  it("REQ-148: la lista trae propios, cada agencia activa y FREETOUR bloqueado con su motivo", () => {
    const l = listaProveedores([{ id: "ag-iwp", name: "IWP Viajes" }]);
    expect(l.map((p) => p.id)).toEqual(["propios", "agencia:ag-iwp", FREETOUR]);
    expect(l.at(-1)).toMatchObject({ bloqueado: true });
    expect(l.at(-1)?.motivo).toMatch(/autorizaci[oó]n escrita/i);
  });
  it("REQ-148: aunque pidan FREETOUR, no se busca en él", () => {
    expect(buscarViajes(CAT, { q: "oaxaca", proveedores: [FREETOUR] })).toEqual([]);
  });
});

describe("REQ-149: búsqueda (gate G2 C)", () => {
  it("REQ-149: encuentra por ciudad, país o título sin importar acentos ni mayúsculas", () => {
    expect(buscarViajes(CAT, { q: "quiero ir a OAXACA", proveedores: ["propios", "agencia:ag-iwp", "agencia:ag-otra"] }).map((r) => r.slug)).toEqual(["oaxaca"]);
    expect(buscarViajes(CAT, { q: "algo en peru", proveedores: ["propios", "agencia:ag-iwp", "agencia:ag-otra"] }).map((r) => r.slug)).toEqual(["cusco"]);
    expect(buscarViajes(CAT, { q: "monte alban", proveedores: ["agencia:ag-iwp"] }).map((r) => r.slug)).toEqual(["oaxaca"]);
  });
  it("REQ-149: con el interruptor de un proveedor apagado no salen sus viajes", () => {
    expect(buscarViajes(CAT, { q: "oaxaca", proveedores: ["propios"] })).toEqual([]);
  });
  it("REQ-149: máximo 5 resultados y sin coincidencias no inventa nada", () => {
    const muchos = Array.from({ length: 9 }, (_, i) => v({ slug: `t${i}`, title: `Tour Oaxaca ${i}` }));
    expect(buscarViajes(muchos, { q: "oaxaca", proveedores: ["propios"] })).toHaveLength(5);
    expect(buscarViajes(CAT, { q: "hola buenas tardes", proveedores: ["propios"] })).toEqual([]);
  });
});

describe("REQ-150: liga prellenada (gate G3 C)", () => {
  it("REQ-150: arma la liga con fecha y personas", () => {
    expect(enlacePrellenado("https://travelpuzzle.com.mx", "/viajes/mexico/oaxaca", { fecha: "2026-11-20", adultos: 2, ninos: 1 }))
      .toBe("https://travelpuzzle.com.mx/viajes/mexico/oaxaca?fecha=2026-11-20&adultos=2&ninos=1#solicitar");
    expect(enlacePrellenado("https://travelpuzzle.com.mx/", "/viajes/mexico/oaxaca", {})).toBe("https://travelpuzzle.com.mx/viajes/mexico/oaxaca#solicitar");
  });
  it("REQ-150: la ficha lee solo valores válidos (fecha real, 1 a 20 adultos, 0 a 20 niños)", () => {
    expect(leerPrellenado({ fecha: "2026-11-20", adultos: "3", ninos: "1" })).toEqual({ fecha: "2026-11-20", adultos: 3, ninos: 1 });
    expect(leerPrellenado({ fecha: "2026-13-40", adultos: "0", ninos: "-1" })).toEqual({});
    expect(leerPrellenado({ fecha: "<script>", adultos: "999" })).toEqual({});
  });
});

describe("REQ-151: precio y fecha en vivo antes de dar la liga", () => {
  it("REQ-151: dice si la fecha está entre las salidas", () => {
    expect(revisarFecha(CAT[0], "2026-11-20")).toEqual({ disponible: true, alternativas: [] });
    expect(revisarFecha(CAT[0], "2026-11-21")).toEqual({ disponible: false, alternativas: ["2026-11-20", "2026-11-27"] });
  });
  it("REQ-151: sin fechas fijas (a solicitud) se acepta y lo confirma la agencia", () => {
    expect(revisarFecha(CAT[1], "2026-12-01")).toEqual({ disponible: true, alternativas: [], aSolicitud: true });
  });
});

describe("REQ-152: solo con la llave", () => {
  it("REQ-152: compara la llave completa", () => {
    expect(autorizado("Bearer abc123abc123abc123abc123", "abc123abc123abc123abc123")).toBe(true);
    expect(autorizado("Bearer abc", "abc123abc123abc123abc123")).toBe(false);
    expect(autorizado(null, "abc123abc123abc123abc123")).toBe(false);
    expect(autorizado("Bearer x", "")).toBe(false);
    expect(autorizado("Bearer corta", "corta")).toBe(false); // llave de menos de 24 caracteres: no sirve
  });
});
