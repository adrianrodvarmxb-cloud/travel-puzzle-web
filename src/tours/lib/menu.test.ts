import { describe, it, expect } from "vitest";
import { withPrimeraPiezaLinks, isPrimeraPiezaEnabled, PRIMERA_PIEZA_LABEL } from "./menu";
import { withTransfersLink } from "@/transfers/lib/nav";
import { HOME_SECTION_IDS } from "@/home/lib/sections";

const base = [
  { href: "/", label: "Inicio" },
  { href: "/tours", label: "Tours" },
  { href: "/#como-funciona", label: "Cómo Funciona" },
];
const menu = (pp: boolean, transfers: boolean, lang = "es") =>
  withPrimeraPiezaLinks(withTransfersLink(base, transfers, "Traslados"), pp, lang);

describe("REQ-093: menú La Primera Pieza tras bandera", () => {
  it("REQ-093: con la bandera encendida: Inicio · La Primera Pieza · Destinos · Tours · Traslados · Cómo Funciona", () => {
    expect(menu(true, true).map((l) => l.label)).toEqual(["Inicio", "La Primera Pieza", "Destinos", "Tours", "Traslados", "Cómo Funciona"]);
    expect(menu(true, true).map((l) => l.href)).toEqual(["/", "/la-primera-pieza", "/destinos", "/tours", "/traslados", "/#como-funciona"]);
  });
  it("REQ-093: con la bandera apagada el menú queda igual que hoy", () => {
    expect(menu(false, true)).toEqual(withTransfersLink(base, true, "Traslados"));
    expect(menu(false, false).map((l) => l.href)).toEqual(["/", "/tours", "/#como-funciona"]);
  });
  it("REQ-093: sin traslados se conserva el orden del resto", () => {
    expect(menu(true, false).map((l) => l.href)).toEqual(["/", "/la-primera-pieza", "/destinos", "/tours", "/#como-funciona"]);
  });
  it("REQ-093: «La Primera Pieza» es nombre de colección y no se traduce; Destinos sí", () => {
    expect(PRIMERA_PIEZA_LABEL).toBe("La Primera Pieza");
    expect(menu(true, false, "en").map((l) => l.label)).toContain("La Primera Pieza");
    expect(menu(true, false, "en").map((l) => l.label)).toContain("Destinations");
  });
  it("REQ-093: no duplica enlaces si ya estaban", () => {
    const twice = withPrimeraPiezaLinks(menu(true, true), true, "es");
    expect(twice.map((l) => l.href)).toEqual(menu(true, true).map((l) => l.href));
  });
  it("REQ-093: solo \"true\" enciende la bandera", () => {
    expect(isPrimeraPiezaEnabled("true")).toBe(true);
    expect(isPrimeraPiezaEnabled("false")).toBe(false);
    expect(isPrimeraPiezaEnabled(undefined)).toBe(false);
  });
  it("REQ-093 + REQ-068: «Cómo Funciona» apunta a una sección que el home sí pinta", () => {
    expect(HOME_SECTION_IDS).toContain("como-funciona");
  });
});
