import { describe, it, expect, vi } from "vitest";
import { createFreetourClient } from "./freetour.js";

const cfg = { baseUrl: "https://secure.freetour.com/partnersAPI/v.2.0", email: "e@x.com", password: "p", localAddress: "66.29.153.81" };
const loginOk = { status: 200, json: { data: { token: { accessToken: "T1" } } } };

describe("cliente de Freetour de la pasarela", () => {
  it("inicia sesión una vez, reutiliza el token y sale por la IP registrada", async () => {
    const request = vi.fn(async (method, url) => (url.endsWith("/login") ? loginOk : { status: 200, json: { data: { ok: 1 } } }));
    let t = 0;
    const ft = createFreetourClient({ ...cfg, request, now: () => t });
    await ft.call("GET", "/booking/R1");
    t = 10 * 60 * 1000;
    const res = await ft.call("GET", "/booking/R2");
    expect(res).toEqual({ status: 200, json: { data: { ok: 1 } } });
    expect(request.mock.calls.filter(([, url]) => url.endsWith("/login")).length).toBe(1);
    const [, url, opts] = request.mock.calls[2];
    expect(url).toBe("https://secure.freetour.com/partnersAPI/v.2.0/booking/R2");
    expect(opts.headers.Authorization).toBe("Bearer T1");
    expect(opts.localAddress).toBe("66.29.153.81");
  });

  it("si Freetour dice 401, renueva la sesión y reintenta una sola vez", async () => {
    let n = 0;
    const request = vi.fn(async (method, url) => {
      if (url.endsWith("/login")) return { status: 200, json: { data: { token: { accessToken: `T${++n}` } } } };
      return n === 1 ? { status: 401, json: {} } : { status: 200, json: { data: "ok" } };
    });
    const ft = createFreetourClient({ ...cfg, request, now: () => 0 });
    const res = await ft.call("POST", "/booking", { a: 1 });
    expect(res.status).toBe(200);
    expect(request.mock.calls.filter(([, url]) => url.endsWith("/login")).length).toBe(2);
  });

  it("si el login falla, lanza un error sin mostrar la contraseña", async () => {
    const request = vi.fn(async () => ({ status: 401, json: { data: { errorMessage: "bad" } } }));
    const ft = createFreetourClient({ ...cfg, request, now: () => 0 });
    await expect(ft.call("GET", "/booking/R1")).rejects.toThrow(/login/i);
    await expect(ft.call("GET", "/booking/R1")).rejects.not.toThrow(/p$/);
  });
});
