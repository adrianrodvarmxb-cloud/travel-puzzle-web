// REQ-1579 (INC-010): el contrato de idioma no tumba un deploy por un fallo de transporte de una sola petición.
// npx vitest run src/ops/lib/smoke-contrato-reintento.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rawWithRetry } from "./smoke";

const sinEspera = { sleep: async () => {}, waitMs: 0 };
const cola = <T>(xs: T[]) => { let i = 0; return async () => xs[Math.min(i++, xs.length - 1)]; };

describe("REQ-1579: reintento del contrato de idioma", () => {
  it("REQ-1579: un fallo de transporte (status null) seguido de un 200 termina en 200", async () => {
    const r = await rawWithRetry(cola([{ status: null }, { status: 200 }]), sinEspera);
    expect(r.last.status).toBe(200);
    expect(r.attempts).toBe(2);
  });

  it("REQ-1579: un código real NO se reintenta: el 503 cuenta como falla a la primera", async () => {
    const r = await rawWithRetry(cola([{ status: 503 }, { status: 200 }]), sinEspera);
    expect(r.last.status).toBe(503);
    expect(r.attempts).toBe(1);
  });

  it("REQ-1579: si el transporte falla siempre, se agotan los intentos y sigue en null", async () => {
    const r = await rawWithRetry(cola([{ status: null }]), { ...sinEspera, tries: 3 });
    expect(r.last.status).toBeNull();
    expect(r.attempts).toBe(3);
  });

  it("REQ-1579: un 200 a la primera no reintenta ni espera", async () => {
    let esperas = 0;
    const r = await rawWithRetry(cola([{ status: 200 }]), { sleep: async () => { esperas++; }, waitMs: 0 });
    expect(r.attempts).toBe(1);
    expect(esperas).toBe(0);
  });

  it("REQ-1579: avisa cada reintento con el intento y el resultado previo", async () => {
    const avisos: number[] = [];
    await rawWithRetry(cola([{ status: null }, { status: null }, { status: 200 }]), { ...sinEspera, onRetry: (n) => avisos.push(n) });
    expect(avisos).toEqual([2, 3]);
  });

  it("REQ-1579: el humo usa el reintento en el contrato de idioma y guarda el error del transporte", () => {
    const smoke = readFileSync("src/scripts/smoke.ts", "utf8");
    expect(smoke).toMatch(/rawWithRetry/);
    expect(smoke).toMatch(/contrato de idioma \$\{p\}: estado \$\{r\.status\}/);
    expect(smoke).toMatch(/error: string \| null/);
  });
});
