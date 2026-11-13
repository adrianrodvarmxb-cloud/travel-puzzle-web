import { describe, it, expect } from "vitest";
import { eventDetailPath } from "./event-path";

describe("REQ-3495: ruta de la salida según la versión de la API", () => {
  it("REQ-3495: en 2.0 y 2.1 es /event/{id}", () => {
    expect(eventDetailPath("2.0", 631716698)).toBe("/event/631716698");
    expect(eventDetailPath("2.1", 631716698)).toBe("/event/631716698");
  });

  it("REQ-3495: en 2.2 es /events/{id} (la especificación quitó /event/{id})", () => {
    expect(eventDetailPath("2.2", 631716698)).toBe("/events/631716698");
  });

  it("REQ-3495: el id siempre va codificado", () => {
    expect(eventDetailPath("2.2", "12/34")).toBe("/events/12%2F34");
  });
});
