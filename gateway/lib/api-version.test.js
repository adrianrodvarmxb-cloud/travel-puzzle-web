import { describe, it, expect } from "vitest";
import { resolveBaseUrl } from "./api-version.js";

// REQ-062: la pasarela usa la misma variable que el Worker
describe("REQ-062 pasarela: FREETOUR_API_VERSION", () => {
  it("REQ-062: sin variables, producción v.2.0 como hoy", () => {
    expect(resolveBaseUrl({})).toBe("https://secure.freetour.com/partnersAPI/v.2.0");
  });
  it("REQ-062: la versión cambia solo el sufijo, también sobre FREETOUR_BASE_URL", () => {
    expect(resolveBaseUrl({ FREETOUR_API_VERSION: "2.2" })).toBe("https://secure.freetour.com/partnersAPI/v.2.2");
    expect(resolveBaseUrl({ FREETOUR_BASE_URL: "https://www.freetour.com/partnersAPI/v.2.0", FREETOUR_API_VERSION: "2.2" })).toBe("https://www.freetour.com/partnersAPI/v.2.2");
  });
  it("REQ-062: versión desconocida se ignora", () => {
    expect(resolveBaseUrl({ FREETOUR_API_VERSION: "3" })).toBe("https://secure.freetour.com/partnersAPI/v.2.0");
  });
});
