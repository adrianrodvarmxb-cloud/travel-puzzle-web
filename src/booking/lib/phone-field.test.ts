import { describe, expect, it } from "vitest";
import { phoneLabel } from "./phone-field";

describe("phoneLabel", () => {
  it("REQ-015: si el tour exige teléfono, la etiqueta no dice opcional", () => {
    expect(phoneLabel(true)).toBe("WhatsApp");
    expect(phoneLabel(false)).toBe("WhatsApp (opcional)");
    expect(phoneLabel(undefined)).toBe("WhatsApp (opcional)");
  });
});
