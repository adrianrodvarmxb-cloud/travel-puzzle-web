import { describe, it, expect } from "vitest";
import { enlacesViajes, toursListos, planCalentado } from "./tours-listos";

const ficha = (slug: string, pre = "") => `<a href="${pre}/viajes/tangol/${slug}">x</a>`;

describe("REQ-10842: el calentado exige viajes en /tours (INC-027)", () => {
  it("REQ-10842: cuenta solo enlaces de ficha de viaje distintos (sin repetidos, sin listas ni consultas)", () => {
    const html = `${ficha("glaciar")}${ficha("glaciar")}${ficha("buenos-aires")}<a href="/viajes">lista</a><a href="/viajes/tangol/x?y=1">q</a><a href="/destinos/ar/x/y">tour</a>`;
    expect(enlacesViajes(html)).toEqual(["/viajes/tangol/glaciar", "/viajes/tangol/buenos-aires"]);
  });

  it("REQ-10842: acepta la versión en inglés (/en/viajes/…) y comillas simples", () => {
    expect(enlacesViajes(`<a href='/en/viajes/a/b'>x</a>${ficha("c", "/en")}`)).toEqual(["/en/viajes/a/b", "/en/viajes/tangol/c"]);
  });

  it("REQ-10842: /tours está listo con ≥ 2 fichas distintas; con 0 o 1 no (una sola es la señal de D1 a medias)", () => {
    expect(toursListos("")).toBe(false);
    expect(toursListos(ficha("solo"))).toBe(false);
    expect(toursListos(ficha("a") + ficha("a"))).toBe(false);
    expect(toursListos(ficha("a") + ficha("b"))).toBe(true);
    expect(toursListos(ficha("a") + ficha("b") + ficha("c"), 3)).toBe(true);
  });

  it("REQ-10842: el plan pide /tours y /en/tours, hasta 6 intentos con 15 s, como el calentado de INC-009", () => {
    expect(planCalentado()).toEqual({ rutas: ["/tours", "/en/tours"], intentos: 6, esperaMs: 15_000, minimo: 2 });
  });
});
