import { describe, it, expect, vi } from "vitest";
import { createTangolClient } from "./tangol.js";
import { toTangolRequest, TANGOL_OPERATION_NAMES } from "./tangol-operations.js";

const base = { baseUrl: "https://tangolapi.tangol.com", email: "agencia@example.com", clave: "123", localAddress: "66.29.153.81" };

function fakeRequest(apiStatus = () => 200) {
  return vi.fn(async (method, url) => (url.endsWith("/Tour/Autenticacion") ? { status: 200, json: "tok-1" } : { status: apiStatus(), json: { ListCountries: [] } }));
}

describe("createTangolClient", () => {
  it("REQ-1550: se autentica con email y clave, sale por la IP registrada y manda Bearer", async () => {
    const request = fakeRequest();
    const c = createTangolClient({ ...base, request });
    await c.call("GET", "/Tour/GetTourCountries");
    expect(request.mock.calls[0]).toEqual(["POST", "https://tangolapi.tangol.com/Tour/Autenticacion", { body: { email: "agencia@example.com", clave: "123" }, localAddress: "66.29.153.81" }]);
    const [, url, opts] = request.mock.calls[1];
    expect(url).toBe("https://tangolapi.tangol.com/Tour/GetTourCountries");
    expect(opts.headers.Authorization).toBe("Bearer tok-1");
    expect(opts.localAddress).toBe("66.29.153.81");
  });

  it("REQ-1550: reutiliza el token 50 min y ante 401 reautentica una sola vez", async () => {
    let t = 0;
    let n = 0;
    const request = fakeRequest(() => (++n === 2 ? 401 : 200));
    const c = createTangolClient({ ...base, request, now: () => t });
    await c.call("GET", "/Tour/GetTourCountries");
    t = 49 * 60 * 1000;
    await c.call("GET", "/Tour/GetTourCountries"); // 401 → reautentica
    const auths = request.mock.calls.filter((x) => x[1].endsWith("/Autenticacion"));
    expect(auths).toHaveLength(2);
  });

  it("REQ-1550: tras fallar la autenticación espera 60 s antes de reintentar", async () => {
    let t = 0;
    const request = vi.fn(async () => ({ status: 400, json: { Message: "clave" } }));
    const c = createTangolClient({ ...base, request, now: () => t });
    await expect(c.call("GET", "/Tour/GetTourCountries")).rejects.toThrow(/autenticación falló/);
    t = 30_000;
    await expect(c.call("GET", "/Tour/GetTourCountries")).rejects.toThrow(/en espera/);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("REQ-1550: arma la consulta con los parámetros del swagger", async () => {
    const request = fakeRequest();
    const c = createTangolClient({ ...base, request });
    await c.call("GET", "/Tour/GetTourDestinations", { query: { "params.countryCode": "AR" } });
    expect(request.mock.calls[1][1]).toBe("https://tangolapi.tangol.com/Tour/GetTourDestinations?params.countryCode=AR");
  });
});

describe("toTangolRequest", () => {
  it("REQ-1551: solo 5 operaciones de lectura; reservar o autenticar desde fuera se rechaza", () => {
    expect(TANGOL_OPERATION_NAMES).toEqual(["getCountries", "getDestinations", "getTourList", "getTourDetailsList", "getTourRates"]);
    expect(toTangolRequest("makeBooking", {})).toEqual({ ok: false, reason: "operación no permitida" });
    expect(toTangolRequest("authenticate", {}).ok).toBe(false);
    expect(toTangolRequest("__proto__", {}).ok).toBe(false);
  });

  it("REQ-1551: valida y arma cada petición", () => {
    expect(toTangolRequest("getDestinations", { countryCode: "AR" })).toEqual({ ok: true, method: "GET", path: "/Tour/GetTourDestinations", query: { "params.countryCode": "AR" } });
    expect(toTangolRequest("getDestinations", { countryCode: "AR&x=1" }).ok).toBe(false);
    expect(toTangolRequest("getTourList", { destinationId: 7, languageCode: 1, currency: 0, includeDetails: true })).toEqual({
      ok: true, method: "GET", path: "/Tour/GetTourListByDestination",
      query: { "params.destinationId": 7, "params.languageCode": 1, "params.currency": 0, "params.includeDetails": "true" },
    });
    expect(toTangolRequest("getTourList", { destinationId: 7, languageCode: 9, currency: 0 }).ok).toBe(false);
    expect(toTangolRequest("getTourRates", { tourId: 5, languageCode: "1", currency: "0" })).toEqual({ ok: true, method: "POST", path: "/Tour/GetTourRates", body: { TourId: 5, LanguageCode: "1", Currency: "0" } });
    expect(toTangolRequest("getTourDetailsList", { tourIds: Array.from({ length: 51 }, (_, i) => i + 1), languageCode: "1", currency: "0" }).ok).toBe(false);
  });
});
