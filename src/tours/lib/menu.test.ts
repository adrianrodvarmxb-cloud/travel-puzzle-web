import { describe, it, expect } from "vitest";
import { withPrimeraPiezaLinks, isPrimeraPiezaEnabled, PRIMERA_PIEZA_LABEL, MENU_PRIMERA_PIEZA, footerHubLinks } from "./menu";
import { translations } from "@/lib/translations";
import { withTransfersLink } from "@/transfers/lib/nav";
import { HOME_SECTION_IDS } from "@/home/lib/sections";

const base = [
  { href: "/", label: "Inicio" },
  { href: "/tours", label: "Experiencias" },
  { href: "/#como-funciona", label: "Cómo Funciona" },
];
// REQ-093 conserva el orden viejo con el enlace del menú encendido (reversible con MENU_PRIMERA_PIEZA, REQ-600).
const menu = (pp: boolean, transfers: boolean, lang = "es", showPP = true) =>
  withPrimeraPiezaLinks(withTransfersLink(base, transfers, "Traslados"), pp, lang, showPP);

describe("REQ-093: menú La Primera Pieza tras bandera", () => {
  it("REQ-093: con la bandera encendida: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona", () => {
    expect(menu(true, true).map((l) => l.label)).toEqual(["Inicio", "La Primera Pieza", "Destinos", "Experiencias", "Traslados", "Cómo Funciona"]);
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
    const twice = withPrimeraPiezaLinks(menu(true, true), true, "es", true);
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

const LANGS = ["es", "en", "pt", "de", "fr", "it"] as const;
const DESTINOS = { es: "Destinos", en: "Destinations", pt: "Destinos", de: "Reiseziele", fr: "Destinations", it: "Destinazioni" };

describe("REQ-600: «La Primera Pieza» sale del menú principal (PO, 6 nov 2026, 21:16)", () => {
  it("REQ-600: el menú ya no muestra el enlace (constante MENU_PRIMERA_PIEZA en false)", () => {
    expect(MENU_PRIMERA_PIEZA).toBe(false);
  });
  it.each(LANGS)("REQ-600: en %s (escritorio y celular usan la misma lista): Inicio · Destinos · Experiencias · Traslados · Cómo Funciona", (lang) => {
    const t = translations[lang];
    const links = withPrimeraPiezaLinks(withTransfersLink([
      { href: "/", label: t["nav.home"] },
      { href: "/tours", label: t["nav.tours"] },
      { href: "/#como-funciona", label: t["nav.howItWorks"] },
    ], true, t["nav.transfers"]), true, lang);
    expect(links.map((l) => l.href)).toEqual(["/", "/destinos", "/tours", "/traslados", "/#como-funciona"]);
    expect(links.map((l) => l.label)).toEqual([t["nav.home"], DESTINOS[lang], t["nav.tours"], t["nav.transfers"], t["nav.howItWorks"]]);
    expect(links.map((l) => l.label)).not.toContain(PRIMERA_PIEZA_LABEL);
  });
  it("REQ-600: si ya venía en la lista, también se quita (sin duplicar Destinos)", () => {
    const old = menu(true, true, "es", true);
    expect(withPrimeraPiezaLinks(old, true, "es").map((l) => l.href)).toEqual(["/", "/destinos", "/tours", "/traslados", "/#como-funciona"]);
  });
  it("REQ-600: reversible: con el enlace encendido vuelve el orden firmado de REQ-093", () => {
    expect(menu(true, true, "es", true).map((l) => l.label)).toEqual(["Inicio", "La Primera Pieza", "Destinos", "Experiencias", "Traslados", "Cómo Funciona"]);
  });
  it("REQ-600: con PRIMERA_PIEZA_ENABLED apagada el menú sigue igual que antes", () => {
    expect(menu(false, true, "es", false)).toEqual(withTransfersLink(base, true, "Traslados"));
  });
});

describe("REQ-601: /la-primera-pieza no queda huérfana: enlace en el pie (sitelinks-google)", () => {
  it("REQ-601: con la página encendida el pie la enlaza con su nombre de colección", () => {
    expect(footerHubLinks(true)).toEqual([{ href: "/la-primera-pieza", label: "La Primera Pieza" }]);
  });
  it("REQ-601: con la página apagada (404) el pie no la enlaza", () => {
    expect(footerHubLinks(false)).toEqual([]);
  });
});
