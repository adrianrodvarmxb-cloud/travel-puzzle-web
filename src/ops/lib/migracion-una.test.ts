// REQ-10746: aplicar UNA sola migración de D1 por corrida (la más baja pendiente), con punto de regreso.
// npx vitest run src/ops/lib/migracion-una.test.ts
import { describe, expect, it } from "vitest";
import { elegirMigracion, pendientesDeListado, sqlMarcarAplicada } from "./migracion-una";

const LISTADO = `
⛅️ wrangler 4.46.0
Migrations to be applied:
┌───────────────────────────────┐
│ name                          │
├───────────────────────────────┤
│ 0033_proveedor_preguntas.sql  │
├───────────────────────────────┤
│ 0035_city_coordenadas.sql     │
└───────────────────────────────┘
`;

describe("REQ-10746: una sola migración por corrida", () => {
  it("REQ-10746: lee las pendientes del listado de wrangler, en orden", () => {
    expect(pendientesDeListado(LISTADO)).toEqual(["0033_proveedor_preguntas.sql", "0035_city_coordenadas.sql"]);
    expect(pendientesDeListado("✅ No migrations to apply!")).toEqual([]);
  });

  it("REQ-10746: solo acepta la migración pedida si es la más baja pendiente", () => {
    expect(elegirMigracion(LISTADO, "0033_proveedor_preguntas.sql")).toEqual({ ok: true, archivo: "0033_proveedor_preguntas.sql" });
    expect(elegirMigracion(LISTADO, "0035_city_coordenadas.sql")).toEqual({ ok: false, motivo: "0035_city_coordenadas.sql no es la más baja pendiente; antes va 0033_proveedor_preguntas.sql" });
  });

  it("REQ-10746: si ya está aplicada o no existe, no hace nada y lo dice", () => {
    expect(elegirMigracion(LISTADO, "0027_proveedores_mila.sql")).toEqual({ ok: false, motivo: "0027_proveedores_mila.sql no está pendiente (ya aplicada o no existe)", nada: true });
    expect(elegirMigracion("✅ No migrations to apply!", "0033_proveedor_preguntas.sql")).toEqual({ ok: false, motivo: "0033_proveedor_preguntas.sql no está pendiente (ya aplicada o no existe)", nada: true });
  });

  it("REQ-10746: rechaza nombres que no sean un archivo de migración", () => {
    expect(elegirMigracion(LISTADO, "../wrangler.jsonc")).toEqual({ ok: false, motivo: "nombre inválido: ../wrangler.jsonc" });
    expect(elegirMigracion(LISTADO, "0033_proveedor_preguntas.sql; DROP TABLE x")).toMatchObject({ ok: false });
  });

  it("REQ-10746: el registro en d1_migrations es el mismo que deja wrangler y solo lleva el nombre", () => {
    expect(sqlMarcarAplicada("0033_proveedor_preguntas.sql")).toBe("INSERT INTO d1_migrations (name) VALUES ('0033_proveedor_preguntas.sql')");
    expect(() => sqlMarcarAplicada("x'); DROP TABLE d1_migrations; --")).toThrow();
  });
});
