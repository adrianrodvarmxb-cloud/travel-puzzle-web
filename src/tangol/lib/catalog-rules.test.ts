import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  agencyTripsFromImport,
  reservedCities,
  tangolTourDecision,
  type AgencyTripPlace,
} from "./catalog-rules";

/** Viajes de agencia de ejemplo, con los nombres tal como los capturan los proveedores. */
const incaWorld: AgencyTripPlace[] = [
  { agency: "Inca World Peru", countries: ["PE"], cities: ["Lima", "Paracas"] },
  { agency: "Inca World Peru", countries: ["PE"], cities: ["Cusco", "Machu Picchu"] },
  { agency: "Central Inca World Travel", countries: ["PE"], cities: ["Iquitos"] },
];
const destinoColombia: AgencyTripPlace[] = [
  { agency: "Destino Colombia", countries: ["CO"], cities: ["Bogotá", "Cartagena", "Santa Marta"] },
];
const todos = [...incaWorld, ...destinoColombia];

const raiz = path.resolve(__dirname, "../../..");
const cargar = (archivo: string) => agencyTripsFromImport(JSON.parse(readFileSync(path.join(raiz, "imports", archivo), "utf8")));

describe("reglas del catálogo de Tangol", () => {
  it("REQ-3373: un tour de México queda fuera siempre, haya o no viajes nuestros", () => {
    expect(tangolTourDecision({ country: "MX", city: "Cancún" }, todos)).toEqual({
      publicar: false,
      motivo: "MX no entra en el catálogo de Tangol (REQ-3373)",
    });
    expect(tangolTourDecision({ country: "mx", city: "Tulum" }, [])).toEqual({
      publicar: false,
      motivo: "MX no entra en el catálogo de Tangol (REQ-3373)",
    });
  });

  it("REQ-3373: el resto de Sudamérica se publica completo (no hay agencia que lo reserve)", () => {
    expect(tangolTourDecision({ country: "AR", city: "Buenos Aires" }, todos)).toEqual({ publicar: true });
    expect(tangolTourDecision({ country: "CL", city: "Santiago" }, todos)).toEqual({ publicar: true });
    expect(tangolTourDecision({ country: "BR", city: "Río de Janeiro" }, todos)).toEqual({ publicar: true });
  });

  it("REQ-3374: una ciudad peruana con viaje de Inca World queda fuera; una sin viaje entra", () => {
    const fuera = tangolTourDecision({ country: "PE", city: "Cusco" }, incaWorld);
    expect(fuera.publicar).toBe(false);
    expect(fuera.publicar === false && fuera.motivo).toContain("Inca World");
    expect(tangolTourDecision({ country: "PE", city: "Trujillo" }, incaWorld)).toEqual({ publicar: true });
    expect(tangolTourDecision({ country: "PE", city: "Huaraz" }, incaWorld)).toEqual({ publicar: true });
  });

  it("REQ-3374: «Central Inca» cuenta como Inca World (supuesto de REQ-1570, nombre de REQ-1524)", () => {
    expect(tangolTourDecision({ country: "PE", city: "Iquitos" }, incaWorld).publicar).toBe(false);
  });

  it("REQ-3374: una ciudad colombiana con viaje de Destino Colombia queda fuera; una sin viaje entra", () => {
    const fuera = tangolTourDecision({ country: "CO", city: "Cartagena" }, todos);
    expect(fuera.publicar).toBe(false);
    expect(fuera.publicar === false && fuera.motivo).toContain("Destino Colombia");
    expect(tangolTourDecision({ country: "CO", city: "Cali" }, todos)).toEqual({ publicar: true });
    expect(tangolTourDecision({ country: "CO", city: "Guatapé" }, todos)).toEqual({ publicar: true });
  });

  it("REQ-3374: la regla no cruza países ni agencias", () => {
    // Un viaje de Destino Colombia en Cartagena no tapa una ciudad peruana que se llame igual.
    expect(tangolTourDecision({ country: "PE", city: "Cartagena" }, destinoColombia)).toEqual({ publicar: true });
    // Un viaje de otra agencia (no la que reserva el país) no excluye nada.
    const otra: AgencyTripPlace[] = [{ agency: "Exotic Escapes", countries: ["PE"], cities: ["Cusco"] }];
    expect(tangolTourDecision({ country: "PE", city: "Cusco" }, otra)).toEqual({ publicar: true });
  });

  it("REQ-3375: el cruce de ciudades es el de REQ-1606 (nota entre paréntesis y palabra de más)", () => {
    // Nota del lado del viaje de agencia.
    const conNota: AgencyTripPlace[] = [{ agency: "Inca World Peru", countries: ["PE"], cities: ["Cusco (solo)"] }];
    expect(tangolTourDecision({ country: "PE", city: "Cusco" }, conNota).publicar).toBe(false);
    // Nota del lado del destino de Tangol.
    expect(tangolTourDecision({ country: "PE", city: "Cusco (city tour)" }, incaWorld).publicar).toBe(false);
    // Palabra de más al final del nombre del viaje («Cusco Centro» → Cusco), y acentos indistintos.
    const palabraDeMas: AgencyTripPlace[] = [{ agency: "Destino Colombia", countries: ["CO"], cities: ["Bogota Centro"] }];
    expect(tangolTourDecision({ country: "CO", city: "Bogotá" }, palabraDeMas).publicar).toBe(false);
    // Y una ciudad distinta sigue entrando (la nota no abre la puerta a cualquier nombre).
    expect(tangolTourDecision({ country: "PE", city: "Piura (centro)" }, incaWorld)).toEqual({ publicar: true });
  });

  it("REQ-3375: la cobertura sale de los datos de `imports/`, no de una lista en código", () => {
    const incaReal = readdirSync(path.join(raiz, "imports"))
      .filter((f) => f.startsWith("incaworld-") && f.endsWith(".json"))
      .flatMap((f) => cargar(f));
    const coReal = cargar("destinocolombia-2026.json");
    const cobertura = reservedCities([...incaReal, ...coReal]);
    // Perú: lo que Inca World ya cubre (publicado o en borrador) queda fuera.
    expect(cobertura.PE).toContain("Cusco");
    expect(cobertura.PE).toContain("Iquitos");
    expect(cobertura.PE).not.toContain("Trujillo");
    expect(cobertura.CO).toEqual([
      "Barranquilla",
      "Bogotá",
      "Cartagena",
      "Eje Cafetero",
      "Islas del Rosario / Barú",
      "Medellín",
      "Parque Tayrona",
      "Salento",
      "San Andrés",
      "Santa Marta",
    ]);
    // Con esos datos reales, las ciudades grandes de Tangol en Perú y Colombia quedan ocultas...
    for (const city of ["Cusco", "Lima", "Arequipa", "Puno", "Iquitos"]) {
      expect(tangolTourDecision({ country: "PE", city }, [...incaReal, ...coReal]).publicar).toBe(false);
    }
    for (const city of ["Cartagena", "Bogotá", "Medellín", "Santa Marta"]) {
      expect(tangolTourDecision({ country: "CO", city }, [...incaReal, ...coReal]).publicar).toBe(false);
    }
    // ...y las que nadie cubre se publican.
    for (const city of ["Trujillo", "Chiclayo", "Huaraz", "Tarapoto", "Máncora", "Piura"]) {
      expect(tangolTourDecision({ country: "PE", city }, [...incaReal, ...coReal])).toEqual({ publicar: true });
    }
  });

  it("REQ-3375: un nombre agrupado solo tapa lo que dice el dato («Eje Cafetero» no tapa Armenia ni Pereira)", () => {
    // Caracterización del estado de hoy: `imports/destinocolombia-2026.json` nombra «Eje Cafetero» y
    // «Salento», no Armenia ni Pereira; y «Islas del Rosario / Barú» no es ninguno de los dos por separado.
    // Si el PO quiere taparlas, se agregan al dato (la cobertura es un archivo de datos, REQ-1571), no al código.
    const co = cargar("destinocolombia-2026.json");
    expect(tangolTourDecision({ country: "CO", city: "Salento" }, co).publicar).toBe(false);
    expect(tangolTourDecision({ country: "CO", city: "Armenia" }, co)).toEqual({ publicar: true });
    expect(tangolTourDecision({ country: "CO", city: "Pereira" }, co)).toEqual({ publicar: true });
    expect(tangolTourDecision({ country: "CO", city: "Islas del Rosario" }, co)).toEqual({ publicar: true });
    // Con el dato completo (la ciudad nombrada en el viaje) sí queda fuera, sin cambiar la regla.
    const conDato = [...co, { agency: "Destino Colombia", countries: ["CO"], cities: ["Armenia", "Pereira", "Islas del Rosario"] }];
    expect(tangolTourDecision({ country: "CO", city: "Armenia" }, conDato).publicar).toBe(false);
    expect(tangolTourDecision({ country: "CO", city: "Islas del Rosario" }, conDato).publicar).toBe(false);
  });

  it("REQ-3374: sin país o sin ciudad el tour se guarda oculto, no se publica a ciegas", () => {
    expect(tangolTourDecision({ country: "", city: "Cusco" }, todos).publicar).toBe(false);
    expect(tangolTourDecision({ country: "PE", city: "   " }, todos).publicar).toBe(false);
  });
});
