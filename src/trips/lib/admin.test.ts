import { describe, it, expect } from "vitest";
import { isAdmin } from "./admin";

describe("isAdmin", () => {
  it("solo cuentas con rol ADMIN", () => {
    expect(isAdmin({ user: { role: "ADMIN" } })).toBe(true);
    expect(isAdmin({ user: { role: "CLIENT" } })).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({})).toBe(false);
  });
});
