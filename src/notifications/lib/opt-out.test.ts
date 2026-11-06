import { describe, expect, it } from "vitest";
import { optOutChecker, sha256Hex } from "./opt-out";

describe("REQ-267 negativa «No publicidad»", () => {
  it("REQ-267 sin la variable no hay forma de consultar (undefined → el bloque no se muestra)", () => {
    expect(optOutChecker(undefined)).toBeUndefined();
  });
  it("REQ-267 variable vacía = nadie se ha negado", async () => {
    expect(await optOutChecker("")!("ana@example.com")).toBe(false);
  });
  it("REQ-267 compara el SHA-256 del correo normalizado; nunca guarda correos en claro", async () => {
    const h = await sha256Hex("ana@example.com");
    const check = optOutChecker(` ${h.toUpperCase()} , no-es-hash, ana@example.com`)!;
    expect(await check("  Ana@Example.com ")).toBe(true);
    expect(await check("otro@example.com")).toBe(false);
  });
});
