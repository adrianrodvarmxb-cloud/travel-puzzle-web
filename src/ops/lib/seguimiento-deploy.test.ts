import { describe, expect, it } from "vitest";
import { estadoPublicacion, type RunDeploy } from "./seguimiento-deploy";

const run = (id: number, status: string, conclusion: string | null, incluye = true): RunDeploy => ({ id, status, conclusion, incluye });

// REQ-10521 (INC-016): el deploy que lanza blog-diario puede quedar «cancelled» porque un push a main lo reemplaza en
// la cola de concurrencia; el que lo reemplaza también publica la entrada. Se sigue a ese, no se declara NO PUBLICADO.
describe("REQ-10521: seguir al deploy que publica el commit del blog", () => {
  it("REQ-10521: el despachado cancelado y uno posterior que incluye el commit en verde → verde con el posterior", () => {
    expect(estadoPublicacion([run(444, "completed", "cancelled"), run(447, "completed", "success")])).toEqual({ estado: "verde", id: 447 });
  });

  it("REQ-10521: cancelado y otro con el commit aún corriendo → esperando (no es falla)", () => {
    expect(estadoPublicacion([run(444, "completed", "cancelled"), run(445, "queued", null), run(447, "in_progress", null)])).toEqual({ estado: "esperando" });
  });

  it("REQ-10521 (caso 13 nov): solo cancelados por ahora → esperando, nunca NO PUBLICADO de inmediato", () => {
    expect(estadoPublicacion([run(444, "completed", "cancelled"), run(445, "completed", "cancelled")])).toEqual({ estado: "esperando" });
    expect(estadoPublicacion([])).toEqual({ estado: "esperando" });
  });

  it("REQ-10521: un deploy que incluye el commit falla y no hay otro pendiente → fallo con su id y conclusión", () => {
    expect(estadoPublicacion([run(444, "completed", "cancelled"), run(447, "completed", "failure")])).toEqual({ estado: "fallo", id: 447, conclusion: "failure" });
  });

  it("REQ-10521: una falla no gana si después viene otro deploy con el commit pendiente", () => {
    expect(estadoPublicacion([run(446, "completed", "failure"), run(447, "in_progress", null)])).toEqual({ estado: "esperando" });
  });

  it("REQ-10521: un deploy en verde que NO incluye el commit del blog no cuenta", () => {
    expect(estadoPublicacion([run(443, "completed", "success", false), run(444, "completed", "cancelled")])).toEqual({ estado: "esperando" });
  });
});
