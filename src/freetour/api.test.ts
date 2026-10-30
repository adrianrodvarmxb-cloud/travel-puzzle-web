import { describe, it, expect, vi } from "vitest";
import { createFreetourApi } from "./api";
import { FREETOUR_HOSTS } from "./lib/hosts";

const config = { environment: "stage" as const, baseUrl: FREETOUR_HOSTS.stage, email: "e", password: "p" };

function fakeFetch() {
  return vi.fn(async (url: string) => {
    if (url.endsWith("/login")) {
      return new Response(JSON.stringify({ data: { token: { accessToken: "tok" } }, status: 200 }));
    }
    return new Response(JSON.stringify({ data: [], status: 200 }));
  });
}

describe("createFreetourApi", () => {
  it("hace login y la consulta contra el mismo host", async () => {
    const fetchImpl = fakeFetch();
    const api = createFreetourApi({ config, fetch: fetchImpl as unknown as typeof fetch });
    await api.get("/countries");
    const urls = fetchImpl.mock.calls.map((c) => c[0]);
    expect(urls).toEqual([`${FREETOUR_HOSTS.stage}/login`, `${FREETOUR_HOSTS.stage}/countries`]);
  });

  it("puede llamar a v.2.1 en el mismo host", async () => {
    const fetchImpl = fakeFetch();
    const api = createFreetourApi({ config, fetch: fetchImpl as unknown as typeof fetch });
    await api.get("/tours/1/reviews", { version: "2.1" });
    expect(fetchImpl.mock.calls[1][0]).toBe("https://stage.freetour.dev/partnersAPI/v.2.1/tours/1/reviews");
  });

  it("manda el token como Bearer y lo reutiliza", async () => {
    const fetchImpl = fakeFetch();
    const api = createFreetourApi({ config, fetch: fetchImpl as unknown as typeof fetch });
    await api.get("/countries");
    await api.get("/countries");
    const logins = fetchImpl.mock.calls.filter((c) => String(c[0]).endsWith("/login"));
    expect(logins).toHaveLength(1);
    const headers = ((fetchImpl.mock.calls[1] as unknown[])[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
  });

  it("propaga el status y el mensaje real de Freetour", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith("/login")
        ? new Response(JSON.stringify({ data: { token: { accessToken: "tok" } } }))
        : new Response(JSON.stringify({ data: { errorMessage: "Bookings are not allowed", errorCode: 0 }, status: 403 }), { status: 403 })
    );
    const api = createFreetourApi({ config, fetch: fetchImpl as unknown as typeof fetch });
    await expect(api.get("/booking/x")).rejects.toMatchObject({ status: 403, errorCode: 0, message: "Bookings are not allowed" });
  });
});
