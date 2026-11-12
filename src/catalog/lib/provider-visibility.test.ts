import { describe, it, expect } from "vitest";
import { hiddenProviders, providerWhere, providerSql, withProviderFilter, READ_OPERATIONS } from "./provider-visibility";

describe("visibilidad por proveedor (gate C de Tangol)", () => {
  it("REQ-3311: con TANGOL_ENABLED apagada, Tangol queda oculto", () => {
    expect(hiddenProviders({})).toEqual(["tangol"]);
    expect(hiddenProviders({ TANGOL_ENABLED: "false" })).toEqual(["tangol"]);
    expect(hiddenProviders({ TANGOL_ENABLED: "TRUE" })).toEqual(["tangol"]);
  });

  it("REQ-3311: con TANGOL_ENABLED en \"true\", no se oculta ningún proveedor", () => {
    expect(hiddenProviders({ TANGOL_ENABLED: "true" })).toEqual([]);
  });

  it("REQ-3311: el filtro de Prisma descarta los proveedores ocultos y desaparece al encenderlos", () => {
    expect(providerWhere({})).toEqual({ providerId: { notIn: ["tangol"] } });
    expect(providerWhere({ TANGOL_ENABLED: "true" })).toEqual({});
  });

  it("REQ-3311: el fragmento de SQL usa la tabla indicada y se vacía al encender", () => {
    expect(providerSql({}, "t")).toBe(` AND "t"."providerId" NOT IN ('tangol')`);
    expect(providerSql({})).toBe(` AND "Tour"."providerId" NOT IN ('tangol')`);
    expect(providerSql({ TANGOL_ENABLED: "true" }, "t")).toBe("");
  });

  it("REQ-3311: solo acepta identificadores de proveedor seguros (nada de SQL inyectado)", () => {
    expect(() => providerSql({}, 'x" OR 1=1 --')).toThrow();
  });
});

describe("filtro pegado a la consulta", () => {
  it("REQ-3311: conserva el where original y agrega el proveedor oculto", () => {
    expect(withProviderFilter({ where: { isActive: true }, take: 5 }, {})).toEqual({
      where: { isActive: true, providerId: { notIn: ["tangol"] } }, take: 5,
    });
  });

  it("REQ-3311: una consulta sin where recibe solo el filtro", () => {
    expect(withProviderFilter({}, {})).toEqual({ where: { providerId: { notIn: ["tangol"] } } });
  });

  it("REQ-3311: si la consulta ya pide un proveedor, manda ella (el sync no se rompe)", () => {
    const args = { where: { providerId: "tangol" } };
    expect(withProviderFilter(args, {})).toBe(args);
  });

  it("REQ-3311: con la bandera encendida no cambia nada", () => {
    const args = { where: { isActive: true } };
    expect(withProviderFilter(args, { TANGOL_ENABLED: "true" })).toBe(args);
  });

  it("REQ-3311: la lista de lecturas cubre las operaciones que devuelven tours", () => {
    expect(READ_OPERATIONS).toContain("findMany");
    expect(READ_OPERATIONS).toContain("count");
    expect(READ_OPERATIONS).toContain("groupBy");
    expect(READ_OPERATIONS).not.toContain("upsert");
  });
});
