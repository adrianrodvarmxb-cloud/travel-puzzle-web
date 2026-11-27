// REQ-10748 (decisión 13, REQ-10592): lista antes/después por agencia. «Antes» = cómo clasifica hoy el sitio (mapeo
// `propios` por kind); «después» = con el mapeo firmado de la agencia desde su denominación original (misma regla que
// `lineageForTrip`). Sin denominación original o con categoría `por-revisar`, no cambia y se anota como duda. Puro.
// npx vitest run src/taxonomy/lib/reclasificacion-agencia.test.ts
import { describe, expect, it } from "vitest";
import { reclasificarAgencia, resumenReclasificacion } from "./reclasificacion-agencia";

const entries = [
  { ref: "FCH-R-01", trip: { kind: "circuito", titleEs: "Beijing y Shanghái 8 días", titleEn: "Beijing & Shanghai", priceFrom: 1200, durationDays: 8 } },
  { ref: "FCH-L-02", trip: { kind: "tour", titleEs: "Gran lujo Xian", titleEn: "Luxury Xian", priceFrom: 2000, durationDays: 5 } },
  { ref: "SIN-CODIGO", trip: { kind: "tour", titleEs: "Paseo por el Bund", titleEn: "Bund walk", priceFrom: 40, durationDays: null } },
];

describe("REQ-10748: lista de reclasificación por agencia", () => {
  it("REQ-10748: cada viaje lleva antes (propios por kind), después (mapeo de la agencia) y si cambia", () => {
    const filas = reclasificarAgencia("fantasticachina", entries);
    expect(filas).toHaveLength(3);
    const r1 = filas.find((f) => f.id === "FCH-R-01")!;
    expect(r1.original).toBe("TOUR REGULAR");
    expect(r1.antes).toBe("circuito");
    expect(r1.despues).toBe("circuito");
    expect(r1.cambia).toBe(false);
    const r2 = filas.find((f) => f.id === "FCH-L-02")!;
    expect(r2.original).toBe("TOUR GRAN LUJO");
    expect(r2.despues).toBe("circuito");
    expect(r2.cambia).toBe(r2.antes !== "circuito");
  });

  it("REQ-10748: sin denominación original, no cambia y queda como duda (nunca se inventa la categoría)", () => {
    const filas = reclasificarAgencia("fantasticachina", entries);
    const r3 = filas.find((f) => f.id === "SIN-CODIGO")!;
    expect(r3.original).toBeNull();
    expect(r3.despues).toBe(r3.antes);
    expect(r3.cambia).toBe(false);
    expect(r3.duda).toMatch(/sin denominación original/);
  });

  it("REQ-10748: una agencia con mapeo `por-revisar` (Extime) no cambia ningún viaje y lo dice", () => {
    const filas = reclasificarAgencia("extime", [{ ref: "EXT-1", source: "https://extime.example/x", trip: { kind: "circuito", titleEs: "Marruecos 8 días", titleEn: "", priceFrom: 900, durationDays: 8 } }]);
    expect(filas[0].cambia).toBe(false);
    expect(filas[0].duda).toMatch(/sin denominación original|por-revisar/);
  });

  it("REQ-10748: el resumen cuenta viajes, cambios, sin cambio y dudas", () => {
    const filas = reclasificarAgencia("fantasticachina", entries);
    const r = resumenReclasificacion(filas);
    expect(r.viajes).toBe(3);
    expect(r.cambian + r.igual).toBe(3);
    expect(r.dudas).toBe(1);
  });

  it("REQ-10748: una agencia sin mapeo lanza error (no se inventa)", () => {
    expect(() => reclasificarAgencia("no-existe", entries)).toThrow(/sin mapeo/);
  });
});
