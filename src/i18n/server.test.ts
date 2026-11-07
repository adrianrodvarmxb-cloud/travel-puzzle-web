import { afterEach, describe, expect, it, vi } from "vitest";

const state: { header: string | null; cookie: string | undefined } = { header: null, cookie: undefined };
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => (k === "x-tp-lang" ? state.header : null) }),
  cookies: async () => ({ get: (k: string) => (k === "preferredLanguage" && state.cookie ? { value: state.cookie } : undefined) }),
}));

const { getRouteLanguage, routeLanguageState } = await import("./server");

afterEach(() => { state.header = null; state.cookie = undefined; vi.unstubAllEnvs(); });

describe("getRouteLanguage", () => {
  it("REQ-650: bandera apagada: la cookie, como hoy (aunque llegue el encabezado)", async () => {
    state.header = "de"; state.cookie = "en";
    expect(await getRouteLanguage()).toBe("en");
    expect(await routeLanguageState()).toEqual({ lang: "en", locked: false });
  });

  it("REQ-653: bandera encendida y ruta en alcance: el idioma de la URL gana a la cookie", async () => {
    vi.stubEnv("LOCALE_URLS_ENABLED", "true");
    state.header = "fr"; state.cookie = "en";
    expect(await getRouteLanguage()).toBe("fr");
    expect(await routeLanguageState()).toEqual({ lang: "fr", locked: true });
  });

  it("REQ-659: bandera encendida y sin encabezado (fuera de alcance): la cookie", async () => {
    vi.stubEnv("LOCALE_URLS_ENABLED", "true");
    state.cookie = "pt";
    expect(await getRouteLanguage()).toBe("pt");
    expect(await routeLanguageState()).toEqual({ lang: "pt", locked: false });
  });

  it("REQ-653: un encabezado con un valor inválido no se usa", async () => {
    vi.stubEnv("LOCALE_URLS_ENABLED", "true");
    state.header = "xx";
    expect(await getRouteLanguage()).toBe("es");
  });
});
