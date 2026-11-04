// REQ-021 — acceso a BeMyGuest con token OAuth de 15 min, sin reusar refresh tokens.
import { describe, expect, it } from "vitest";
import { needsNewToken, tokenFromResponse, tokenRequestBody } from "./auth";

const NOW = 1_800_000_000_000;

describe("auth BeMyGuest", () => {
  it("REQ-021: sin token o a menos de 60 s de vencer pide uno nuevo", () => {
    expect(needsNewToken(null, NOW)).toBe(true);
    expect(needsNewToken({ accessToken: "a", expiresAt: NOW + 59_000 }, NOW)).toBe(true);
    expect(needsNewToken({ accessToken: "a", expiresAt: NOW + 10 * 60_000 }, NOW)).toBe(false);
  });

  it("REQ-021: siempre usa client_credentials (nunca refresh_token, que bloquea la llave si se reusa)", () => {
    const body = tokenRequestBody("llave");
    expect(body).toEqual({ grant_type: "client_credentials", client_secret: "llave" });
    expect(JSON.stringify(body)).not.toContain("refresh_token");
  });

  it("REQ-021: calcula el vencimiento con expires_in y rechaza respuestas incompletas", () => {
    expect(tokenFromResponse({ token_type: "Bearer", access_token: "t", refresh_token: "r", expires_in: 900 }, NOW))
      .toEqual({ accessToken: "t", expiresAt: NOW + 900_000 });
    expect(tokenFromResponse({ access_token: "" }, NOW)).toBeNull();
    expect(tokenFromResponse(null, NOW)).toBeNull();
  });
});
