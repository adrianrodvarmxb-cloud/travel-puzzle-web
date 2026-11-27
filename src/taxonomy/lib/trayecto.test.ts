import { describe, expect, it } from "vitest";
import { esTrayectoEntreCiudades } from "./trayecto";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { cartTypeFor } from "./cart-type";
import { CODIGOS_TANGOL } from "@/tangol/lib/taxonomia";

// Títulos reales de producción (D1, solo lectura, 15-11-2026) con la categoría de Tangol de cada uno.
const TRANSPORTE: ReadonlyArray<readonly [string, string]> = [
  ["TRASLADO|TRF IN", "Ruta 40 De Norte A Sur En Bus"],
  ["TRASLADO|TRF", "Ruta 40 De Sur A Norte: De El Calafate A Bariloche"],
  ["TRASLADO|TRF IN", "Traslado Potosí - Uyuni En Bus"],
  ["TRASLADO|TRF IN", "Transfer De Chiclayo A Trujillo"],
  ["TRASLADO|TRF", "Transfer De Trujillo A Chiclayo"],
  ["TRASLADO|TRF IN", "Transfer Desde Hoteis En Fortaleza A Hoteles En Jericoacoara"],
  ["TRASLADO|TRF IN", "Transfer Desde Hoteles En Natal Hasta Hoteles En Pipa "],
  ["TRASLADO|TRF", "Traslado Desde El Calafate A El Chalten"],
  ["TRASLADO|TRF", "Traslado Desde Torres Del Paine A El Calafate"],
  ["TRASLADO|TRF", "Traslado Round Trip Rio De Janeiro - Paraty - Rio De Janeiro"],
  ["TRASLADO|TRF", "Traslado Hotel Salvador - Morro Sao Paulo - Hotel Salvador"],
  ["TRASLADO|IN", "Traslado La Paz - Uyuni En Bus"],
  ["TRASLADO|IN", "Transfer Desde Cordoba Hasta Mina Clavero"],
  ["TRASLADO|OUT", "Traslado Desde El Chaltén Hacia El Calafate"],
  ["TRASLADO|IN/OUT", "Ticket De Bus Regular Desde Chaitén A Puyuhuapi"],
];
const TRASLADO: ReadonlyArray<readonly [string, string]> = [
  ["TRASLADO|TRF IN", "Traslado Hotel En Puerto Varas A Oficina De Cruce Andino"],
  ["TRASLADO|TRF IN", "Traslado Oficina Cruce Andino En Puerto Varas Hasta Hotel En Puerto Montt"],
  ["TRASLADO|TRF IN", "De Baltra A Puerto Ayora: Traslado Con Rancho De Tortugas Y Túneles De Lava"],
  ["TRASLADO|TRF", "Traslado De Ida Y Vuelta Entre Aeropuerto A Hotel Del Centro De Bariloche"],
  ["TRASLADO|TRF", "Traslado Privado Desde Aeropuerto Hasta Hotel En San Fernando Del Valle De Catamarca"],
  ["TRASLADO|IN", "Transfer Aeropuerto De Recife A Maragogi"],
  ["TRASLADO|IN", "Transfer De Llegada Al Centro De La Ciudad"],
  ["TRASLADO|IN", "Traslado Desde Terminal De Bus A Hotel Céntrico"],
  ["TRASLADO|OUT", "Traslado De Salida Al Aeropuerto"],
  ["TRASLADO|OUT", "Transfer Privado De Partida: Hotel A Aeropuerto Internacional El Edén"],
  ["TRASLADO|IN/OUT", "Transfer Desde Y Hacia Puerto Varas – Muelle En Puerto Montt"],
  ["TRASLADO|TRFOUTBUS", "Traslado Hotel Centro En Puerto Varas A Terminal De Bus"],
  ["TRASLADO|TRFINBUS", "Transfer In De Llegada Terminal De Bus Al Hotel"],
];
const clasifica = (clave: string, titulo: string) => classify({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL[clave], precio: 50, durationMinutes: 120, titulo }, D, M);

describe("REQ-10708 traslados por trayecto real", () => {
  it.each(TRANSPORTE)("REQ-10708: %s «%s» es un trayecto entre ciudades → Transporte, carrito transport, sección traslados", (clave, titulo) => {
    expect(esTrayectoEntreCiudades(titulo)).toBe(true);
    const r = clasifica(clave, titulo);
    expect(r.formato).toBe("transporte");
    expect(r.seccion).toBe("traslados");
    expect(cartTypeFor(r.formato)).toBe("transport");
  });
  it.each(TRASLADO)("REQ-10708: %s «%s» llega o sale de un punto de viaje → Traslado, carrito transfer, sección traslados", (clave, titulo) => {
    expect(esTrayectoEntreCiudades(titulo)).toBe(false);
    const r = clasifica(clave, titulo);
    expect(r.formato).toBe("traslado");
    expect(r.seccion).toBe("traslados");
    expect(cartTypeFor(r.formato)).toBe("transfer");
  });
  it("REQ-10708: el mismo viaje en los dos sentidos queda igual aunque Tangol lo mande en categorías distintas (Ruta 40)", () => {
    expect(clasifica("TRASLADO|TRF IN", "Ruta 40 De Norte A Sur En Bus").formato).toBe(clasifica("TRASLADO|TRF", "Ruta 40 De Sur A Norte: De El Calafate A Bariloche").formato);
  });
  it("REQ-10708: «Puerto» en el nombre de una ciudad no cuenta como punto de viaje; un título vacío no es trayecto", () => {
    expect(esTrayectoEntreCiudades("Traslado Puerto Varas O Puerto Montt A Frutillar")).toBe(true);
    expect(esTrayectoEntreCiudades("   ")).toBe(false);
  });
  it("REQ-10708: una categoría de traslados sin la regla encendida no cambia (regreso en un paso: quitar la regla del mapeo)", () => {
    const sinRegla = { ...M, tangol: { ...M.tangol, categorias: M.tangol.categorias.map((c) => ({ ...c, reglasPorPalabra: c.reglasPorPalabra.filter((r) => r !== "trayecto-entre-ciudades") })) } };
    const r = classify({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL["TRASLADO|TRF IN"], precio: 50, durationMinutes: 240, titulo: "Traslado Potosí - Uyuni En Bus" }, D, sinRegla);
    expect(r.formato).toBe("traslado");
  });
});
