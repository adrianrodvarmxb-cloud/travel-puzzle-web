import { describe, expect, it } from "vitest";
import { cabecerasFrente } from "./frentes";

describe("cabeceras de la API de frentes", () => {
  it("REQ-1621: con cuerpo, declara Content-Type: application/json (sin esto GitHub responde 415)", () => {
    const h = cabecerasFrente("tok", true);
    expect(h["Content-Type"]).toBe("application/json");
    expect(h.Authorization).toBe("Bearer tok");
    expect(h.Accept).toBe("application/vnd.github+json");
  });

  it("REQ-1621: sin cuerpo (GET) no manda Content-Type", () => {
    const h = cabecerasFrente("tok", false);
    expect(h["Content-Type"]).toBeUndefined();
    expect(h.Authorization).toBe("Bearer tok");
  });
});
