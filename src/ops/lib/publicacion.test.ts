// REQ-1610 (gates A1 y B1): producción no se queda atrás de main sin que nadie lo note.
// npx vitest run src/ops/lib/publicacion.test.ts
import { describe, expect, it } from "vitest";
import { decidirPublicacion, MAX_REINTENTOS_DIA, type EstadoPublicacion } from "./publicacion";

const base: EstadoPublicacion = {
  shaMain: "aaa",
  shaUltimoExitoso: "aaa",
  ultimoDeploy: { status: "completed", conclusion: "success" },
  reintentosHoy: 0,
};
const con = (x: Partial<EstadoPublicacion>) => decidirPublicacion({ ...base, ...x });

describe("REQ-1610: verificador de publicación", () => {
  it("REQ-1610: si producción sirve el HEAD de main, no hace nada", () => {
    expect(con({}).accion).toBe("esperar");
  });

  it("REQ-1610: si hay un deploy en curso, espera (no lanza otro encima)", () => {
    expect(con({ shaMain: "bbb", ultimoDeploy: { status: "in_progress", conclusion: null } }).accion).toBe("esperar");
    expect(con({ shaMain: "bbb", ultimoDeploy: { status: "queued", conclusion: null } }).accion).toBe("esperar");
  });

  it("REQ-1610 (A1): si el último deploy se revirtió y main sigue sin publicar, relanza", () => {
    const d = con({ shaMain: "bbb", ultimoDeploy: { status: "completed", conclusion: "failure" } });
    expect(d.accion).toBe("reintentar");
    expect(d.motivo).toContain("failure");
  });

  it("REQ-1610 (A1): un deploy cancelado también deja producción atrás y se relanza", () => {
    expect(con({ shaMain: "bbb", ultimoDeploy: { status: "completed", conclusion: "cancelled" } }).accion).toBe("reintentar");
  });

  it("REQ-1610 (B1): con un relanzamiento ya hecho hoy, avisa en vez de insistir", () => {
    const d = con({ shaMain: "bbb", ultimoDeploy: { status: "completed", conclusion: "failure" }, reintentosHoy: MAX_REINTENTOS_DIA });
    expect(d.accion).toBe("avisar");
    expect(d.motivo).toContain("ya se relanzó");
  });

  it("REQ-1610: sin ningún deploy en verde no se relanza a ciegas: avisa", () => {
    const d = con({ shaMain: "bbb", shaUltimoExitoso: null, ultimoDeploy: { status: "completed", conclusion: "failure" } });
    expect(d.accion).toBe("avisar");
    expect(d.motivo).toContain("a ciegas");
  });

  it("REQ-1610: si el último deploy fue en verde y main avanzó después, espera a su agente", () => {
    const d = con({ shaMain: "bbb", shaUltimoExitoso: "aaa", ultimoDeploy: { status: "completed", conclusion: "success" } });
    expect(d.accion).toBe("esperar");
    expect(d.motivo).toContain("avanzó después");
  });

  it("REQ-1610: sin deploys registrados, espera", () => {
    expect(con({ shaMain: "bbb", shaUltimoExitoso: null, ultimoDeploy: null }).accion).toBe("esperar");
  });

  it("REQ-1610 (B1): el tope por omisión es uno al día", () => {
    expect(MAX_REINTENTOS_DIA).toBe(1);
  });
});
