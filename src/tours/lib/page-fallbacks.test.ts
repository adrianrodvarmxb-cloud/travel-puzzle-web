import { describe, it, expect, vi } from "vitest";
import { countryCodesFor, orFallback } from "./page-fallbacks";

const overloaded = () => new Error("D1 DB is overloaded. Too many resources consumed within a 10 second window");
const noSleep = async () => {};

describe("REQ-3489: /tours no cae por los códigos de país de los viajes", () => {
  it("REQ-3489: sin viajes no consulta la base", async () => {
    const findMany = vi.fn();
    expect(await countryCodesFor(false, findMany, { sleep: noSleep })).toEqual({});
    expect(findMany).not.toHaveBeenCalled();
  });

  it("REQ-3489: con viajes arma id → código en mayúsculas", async () => {
    const findMany = vi.fn(async () => [{ id: 1, code: "mx" }, { id: 2, code: "pe" }]);
    expect(await countryCodesFor(true, findMany, { sleep: noSleep })).toEqual({ 1: "MX", 2: "PE" });
  });

  it("REQ-3489: si D1 está saturada, reintenta y luego sigue", async () => {
    const findMany = vi.fn().mockRejectedValueOnce(overloaded()).mockResolvedValueOnce([{ id: 3, code: "co" }]);
    expect(await countryCodesFor(true, findMany, { sleep: noSleep })).toEqual({ 3: "CO" });
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it("REQ-3489: si la base sigue fallando, devuelve vacío y registra (la página no responde 500)", async () => {
    const log = vi.fn();
    const findMany = vi.fn(async () => { throw overloaded(); });
    expect(await countryCodesFor(true, findMany, { sleep: noSleep, log })).toEqual({});
    expect(log).toHaveBeenCalled();
  });
});

describe("REQ-3490: la lista de países de los filtros no tumba /tours", () => {
  it("REQ-3490: si carga, pasa tal cual", async () => {
    expect(await orFallback(Promise.resolve([{ id: 1 }]), [], "países")).toEqual([{ id: 1 }]);
  });

  it("REQ-3490: si falla, devuelve el respaldo y registra el motivo", async () => {
    const log = vi.fn();
    expect(await orFallback(Promise.reject(new Error("Failed to fetch countries")), [], "países", log)).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("países"), "Failed to fetch countries");
  });
});
