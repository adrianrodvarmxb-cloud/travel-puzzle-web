import { describe, it, expect, vi } from "vitest";
import { createTangolApi, TangolError } from "./api";
import { signRequest } from "../booking/lib/signature";

const config = { gatewayUrl: "https://pasarela.travelpuzzle.com.mx/", secret: "s3cr3t" };

function fakeFetch(json: unknown, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(json), { status }));
}

const sent = (f: ReturnType<typeof fakeFetch>) => {
  const [url, init] = f.mock.calls[0];
  return { url, init: init!, body: JSON.parse(String(init!.body)) };
};

describe("createTangolApi (por la pasarela)", () => {
  it("REQ-1552: llama solo a la pasarela /tangol con la firma HMAC; nunca a Tangol directo", async () => {
    const f = fakeFetch({ ListCountries: [] });
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch, now: () => 1_800_000_000_000 });
    await api.getCountries();
    const { url, init, body } = sent(f);
    expect(url).toBe("https://pasarela.travelpuzzle.com.mx/tangol");
    expect(body).toEqual({ op: "getCountries", payload: {} });
    const h = init.headers as Record<string, string>;
    expect(h["x-tp-timestamp"]).toBe("1800000000000");
    expect(h["x-tp-signature"]).toBe(await signRequest("s3cr3t", "1800000000000", String(init.body)));
    expect(f.mock.calls.some((c) => String(c[0]).includes("tangol.com"))).toBe(false);
  });

  it("REQ-1552: si la pasarela responde error lanza TangolError con su status", async () => {
    const f = fakeFetch({ error: "Tangol no configurado" }, 503);
    const api = createTangolApi({ config, fetch: f as unknown as typeof fetch });
    const err = await api.getCountries().catch((e) => e);
    expect(err).toBeInstanceOf(TangolError);
    expect(err.status).toBe(503);
    expect(err.message).toBe("Tangol no configurado");
  });

  it("REQ-1541: destinos y tours se validan; un tour malo se descarta y se cuenta", async () => {
    const f1 = fakeFetch({ ListDestinations: [{ Id: 7, Description: "Buenos Aires", CountryCode: "AR", ToursQty: 3 }] });
    const dest = await createTangolApi({ config, fetch: f1 as unknown as typeof fetch }).getDestinations("AR");
    expect(dest.items).toEqual([{ id: 7, name: "Buenos Aires", countryCode: "AR", toursQty: 3 }]);
    expect(sent(f1).body).toEqual({ op: "getDestinations", payload: { countryCode: "AR" } });

    const f2 = fakeFetch({ ListTours: [{ TourId: 1, Name: "City tour", MinRate: 30, Currency: 0, UrlTour: "https://tangol.com/x" }, { Name: "sin id" }] });
    const res = await createTangolApi({ config, fetch: f2 as unknown as typeof fetch }).getTourList({ destinationId: 7, languageCode: 1, currency: 0, includeDetails: true });
    expect(res.items.map((t) => t.tourId)).toEqual([1]);
    expect(res.discarded).toBe(1);
    expect(sent(f2).body).toEqual({ op: "getTourList", payload: { destinationId: 7, languageCode: 1, currency: 0, includeDetails: true } });
  });

  it("REQ-1542: pide las tarifas con tourId, idioma y moneda", async () => {
    const f = fakeFetch({ TourId: 1, ListTourOption: [], ListTourRate: [], ListBlackDate: [] });
    const r = await createTangolApi({ config, fetch: f as unknown as typeof fetch }).getTourRates({ tourId: 1, languageCode: "1", currency: "0" });
    expect(r.tourId).toBe(1);
    expect(sent(f).body).toEqual({ op: "getTourRates", payload: { tourId: 1, languageCode: "1", currency: "0" } });
  });
});
