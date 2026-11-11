import { describe, it, expect, vi } from "vitest";
import { createTangolApi, TangolError } from "./api";

const config = { baseUrl: "https://tangolapi.tangol.com", email: "agencia@example.com", clave: "123" };

type Handler = (url: string, init?: RequestInit) => Response;

function fakeFetch(handler: Handler) {
  return vi.fn(async (url: string, init?: RequestInit) => handler(String(url), init));
}

const okAuth = () => new Response(JSON.stringify("tok-1"), { status: 200 });

describe("createTangolApi", () => {
  it("REQ-1540: se autentica con email y clave y manda el token como Bearer", async () => {
    const f = fakeFetch((url) => (url.endsWith("/Tour/Autenticacion") ? okAuth() : new Response(JSON.stringify({ ListCountries: [] }))));
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch });
    await api.getCountries();
    const [authUrl, authInit] = f.mock.calls[0];
    expect(authUrl).toBe("https://tangolapi.tangol.com/Tour/Autenticacion");
    expect(JSON.parse(String(authInit?.body))).toEqual({ email: "agencia@example.com", clave: "123" });
    const headers = (f.mock.calls[1][1]?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-1");
  });

  it("REQ-1540: reutiliza el token 50 minutos y luego lo renueva", async () => {
    let t = 0;
    const f = fakeFetch((url) => (url.endsWith("/Tour/Autenticacion") ? okAuth() : new Response(JSON.stringify({ ListCountries: [] }))));
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch, now: () => t });
    await api.getCountries();
    t = 49 * 60 * 1000;
    await api.getCountries();
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/Autenticacion"))).toHaveLength(1);
    t = 51 * 60 * 1000;
    await api.getCountries();
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/Autenticacion"))).toHaveLength(2);
  });

  it("REQ-1540: ante 401 reautentica una sola vez", async () => {
    let calls = 0;
    const f = fakeFetch((url) => {
      if (url.endsWith("/Tour/Autenticacion")) return okAuth();
      calls++;
      return calls === 1 ? new Response("", { status: 401 }) : new Response(JSON.stringify({ ListCountries: [] }));
    });
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch });
    await api.getCountries();
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/Autenticacion"))).toHaveLength(2);
  });

  it("REQ-1540: si la autenticación falla lanza TangolError con auth=true y no reintenta", async () => {
    const f = fakeFetch(() => new Response("Credenciales inválidas", { status: 400 }));
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch });
    const err = await api.getCountries().catch((e) => e);
    expect(err).toBeInstanceOf(TangolError);
    expect(err.auth).toBe(true);
    expect(err.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("REQ-1541: destinos y tours van con los nombres de parámetro del swagger", async () => {
    const f = fakeFetch((url) => {
      if (url.endsWith("/Tour/Autenticacion")) return okAuth();
      if (url.includes("GetTourDestinations")) return new Response(JSON.stringify({ ListDestinations: [{ Id: 7, Description: "Buenos Aires", CountryCode: "AR", ToursQty: 3 }] }));
      return new Response(JSON.stringify({ ListTours: [] }));
    });
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch });
    const dest = await api.getDestinations("AR");
    expect(dest.items).toEqual([{ id: 7, name: "Buenos Aires", countryCode: "AR", toursQty: 3 }]);
    await api.getTourList({ destinationId: 7, languageCode: 1, currency: 0, includeDetails: true });
    const u1 = new URL(String(f.mock.calls[1][0]));
    expect(u1.pathname).toBe("/Tour/GetTourDestinations");
    expect(u1.searchParams.get("params.countryCode")).toBe("AR");
    const u2 = new URL(String(f.mock.calls[2][0]));
    expect(u2.pathname).toBe("/Tour/GetTourListByDestination");
    expect(Object.fromEntries(u2.searchParams)).toEqual({ "params.destinationId": "7", "params.languageCode": "1", "params.currency": "0", "params.includeDetails": "true" });
  });

  it("REQ-1541: un tour malo se descarta y se cuenta; los buenos llegan", async () => {
    const f = fakeFetch((url) =>
      url.endsWith("/Tour/Autenticacion")
        ? okAuth()
        : new Response(JSON.stringify({ ListTours: [{ TourId: 1, Name: "City tour", MinRate: 30, Currency: 0, UrlTour: "https://tangol.com/x" }, { Name: "sin id" }] }))
    );
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch });
    const res = await api.getTourList({ destinationId: 7, languageCode: 1, currency: 0 });
    expect(res.items.map((t) => t.tourId)).toEqual([1]);
    expect(res.discarded).toBe(1);
  });

  it("REQ-1542: pide las tarifas por POST con TourId, idioma y moneda", async () => {
    const f = fakeFetch((url) => (url.endsWith("/Tour/Autenticacion") ? okAuth() : new Response(JSON.stringify({ TourId: 1, ListTourOption: [], ListTourRate: [], ListBlackDate: [] }))));
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch });
    const r = await api.getTourRates({ tourId: 1, languageCode: "1", currency: "0" });
    expect(r.tourId).toBe(1);
    const [url, init] = f.mock.calls[1];
    expect(url).toBe("https://tangolapi.tangol.com/Tour/GetTourRates");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ TourId: 1, LanguageCode: "1", Currency: "0" });
  });
});
