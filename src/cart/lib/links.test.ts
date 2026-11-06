import { describe, expect, it } from "vitest";
import { tripUrl } from "./links";

describe("Enlace a «Arma tu viaje» desde la reserva", () => {
  it("REQ-182: con la bandera encendida y la reserva activa da el enlace con el token; sin país ni viajero en la URL", () => {
    expect(tripUrl({ site: "https://travelpuzzle.com.mx/", token: "tok_abcdefgh12345678", enabled: true, status: "active" }))
      .toBe("https://travelpuzzle.com.mx/arma-tu-viaje?reserva=tok_abcdefgh12345678");
    expect(tripUrl({ site: "", token: "tok_abcdefgh12345678", enabled: true, status: "active" })).toBe("/arma-tu-viaje?reserva=tok_abcdefgh12345678");
  });

  it("REQ-182: con la bandera apagada, reserva no activa o token raro no hay enlace", () => {
    expect(tripUrl({ site: "https://x.mx", token: "tok_abcdefgh12345678", enabled: false, status: "active" })).toBeNull();
    expect(tripUrl({ site: "https://x.mx", token: "tok_abcdefgh12345678", enabled: true, status: "canceled" })).toBeNull();
    expect(tripUrl({ site: "https://x.mx", token: "../x", enabled: true, status: "active" })).toBeNull();
    expect(tripUrl({ site: "https://x.mx", token: null, enabled: true, status: "active" })).toBeNull();
  });
});
