import { describe, it, expect } from "vitest";
import { planDestinationsRequest, isSiteNavigation } from "./request-plan";

const plan = (path: string, search = "") => planDestinationsRequest(path, new URLSearchParams(search));

describe("REQ-092: qué URL revisa el middleware (solo con la bandera encendida)", () => {
  it("REQ-092: ficha vieja /tours/{id}", () => {
    expect(plan("/tours/ck123abc")).toEqual({ kind: "legacy-tour", id: "ck123abc" });
    expect(plan("/tours/ck123abc/")).toEqual({ kind: "legacy-tour", id: "ck123abc" });
  });

  it("REQ-092: /tours?countryId= solo si es el único filtro", () => {
    expect(plan("/tours", "countryId=42")).toEqual({ kind: "legacy-country", countryId: 42 });
    expect(plan("/tours", "countryId=42&search=lima")).toBeNull();
    expect(plan("/tours", "countryId=abc")).toBeNull();
    expect(plan("/tours")).toBeNull();
  });

  it("REQ-092 (gate 4): viaje propio /viajes/{destino}/{slug}", () => {
    expect(plan("/viajes/mexico/teotihuacan")).toEqual({ kind: "own-trip", slug: "teotihuacan" });
    expect(plan("/viajes/gracias")).toBeNull();
  });

  it("REQ-092: ficha nueva (para responder 410 si el tour fue retirado)", () => {
    expect(plan("/destinos/mx/ciudad-de-mexico/centro-historico")).toEqual({ kind: "tour-slug", pais: "mx", ciudad: "ciudad-de-mexico", slug: "centro-historico" });
    expect(plan("/destinos/mx/ciudad-de-mexico")).toBeNull();
    expect(plan("/destinos/MX/x/y")).toBeNull();
  });

  it("REQ-102: sitemap-tours-{pais}.xml", () => {
    expect(plan("/sitemap-tours-pe.xml")).toEqual({ kind: "sitemap-tours", pais: "pe" });
    expect(plan("/sitemap-tours-.xml")).toBeNull();
  });

  it("REQ-092: lo demás no se toca", () => {
    for (const p of ["/", "/tours/", "/destinos", "/la-primera-pieza", "/api/tours", "/tours/a/b"]) expect(plan(p)).toBeNull();
  });
});

describe("REQ-10529: el filtro de país de Experiencias no debe mandar a /destinos/{país}", () => {
  const h = (o: Record<string, string>) => (n: string) => o[n.toLowerCase()] ?? null;
  it("REQ-10529: navegación del propio sitio (RSC o mismo origen) no es enlace viejo", () => {
    expect(isSiteNavigation(h({ rsc: "1" }), "travelpuzzle.com.mx")).toBe(true);
    expect(isSiteNavigation(h({ "sec-fetch-site": "same-origin" }), "travelpuzzle.com.mx")).toBe(true);
    expect(isSiteNavigation(h({ referer: "https://travelpuzzle.com.mx/tours?search=x" }), "travelpuzzle.com.mx")).toBe(true);
  });
  it("REQ-10529: enlace viejo de Google u otro sitio sí se redirige", () => {
    expect(isSiteNavigation(h({}), "travelpuzzle.com.mx")).toBe(false);
    expect(isSiteNavigation(h({ referer: "https://www.google.com/" }), "travelpuzzle.com.mx")).toBe(false);
    expect(isSiteNavigation(h({ "sec-fetch-site": "cross-site" }), "travelpuzzle.com.mx")).toBe(false);
  });
});
