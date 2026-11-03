import { describe, it, expect } from "vitest";
import { parseMapsLink, mapsUrl } from "./maps";

describe("parseMapsLink", () => {
  it("lee coordenadas de los formatos comunes de Google Maps", () => {
    expect(parseMapsLink("https://www.google.com/maps/place/Z%C3%B3calo/@17.0608,-96.7253,17z")).toEqual({ lat: 17.0608, lng: -96.7253 });
    expect(parseMapsLink("https://maps.google.com/?q=19.4326,-99.1332")).toEqual({ lat: 19.4326, lng: -99.1332 });
    expect(parseMapsLink("https://www.google.com/maps/place/x/data=!3d35.6595!4d139.7005")).toEqual({ lat: 35.6595, lng: 139.7005 });
    expect(parseMapsLink("19.4326, -99.1332")).toEqual({ lat: 19.4326, lng: -99.1332 });
  });
  it("si no hay coordenadas válidas: null", () => {
    expect(parseMapsLink("https://maps.app.goo.gl/abc")).toBeNull();
    expect(parseMapsLink("200,10")).toBeNull();
  });
  it("arma el enlace para verlo", () => {
    expect(mapsUrl(17.06, -96.72)).toBe("https://www.google.com/maps?q=17.06,-96.72");
  });
});
