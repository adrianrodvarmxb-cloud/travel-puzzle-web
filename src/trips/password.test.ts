import { describe, it, expect, vi } from "vitest";
import { requestPasswordLink, setPasswordWithLink, type PasswordDeps } from "./password";
import { passwordFingerprint, signPasswordLink, PASSWORD_LINK_TTL_MS } from "./lib/password-link";

const now = new Date("2026-11-03T20:00:00Z");
const admin = { email: "ana@tp.mx", name: "Ana", role: "ADMIN", password: "" };

function deps(over: Partial<PasswordDeps> = {}): PasswordDeps {
  return {
    now,
    secret: "s3cr3t",
    siteUrl: "https://travelpuzzle.com.mx/",
    findUser: vi.fn(async (email: string) => (email === admin.email ? admin : null)),
    savePassword: vi.fn(async () => {}),
    hash: vi.fn(async (p: string) => `hash(${p})`),
    send: vi.fn(async () => {}),
    ...over,
  };
}

describe("requestPasswordLink", () => {
  it("a una cuenta ADMIN le manda el enlace firmado", async () => {
    const d = deps();
    expect(await requestPasswordLink(" Ana@TP.mx ", d)).toBe("sent");
    const email = (d.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(email.to).toBe("ana@tp.mx");
    expect(email.text).toMatch(/https:\/\/travelpuzzle\.com\.mx\/admin\/contrasena\?email=ana%40tp\.mx&exp=\d+&sig=/);
  });
  it("a cualquier otro correo no le manda nada (y responde igual)", async () => {
    const d = deps({ findUser: vi.fn(async () => ({ ...admin, role: "CLIENT" })) });
    expect(await requestPasswordLink("ana@tp.mx", d)).toBe("sent");
    expect(await requestPasswordLink("nadie@tp.mx", deps())).toBe("sent");
    expect(d.send).not.toHaveBeenCalled();
  });
  it("si el correo no sale, no truena", async () => {
    const d = deps({ send: vi.fn(async () => { throw new Error("resend"); }) });
    expect(await requestPasswordLink("ana@tp.mx", d)).toBe("sent");
  });
});

describe("setPasswordWithLink", () => {
  async function link(email = "ana@tp.mx", stored = "") {
    const exp = now.getTime() + PASSWORD_LINK_TTL_MS;
    return { email, exp, sig: await signPasswordLink("s3cr3t", email, await passwordFingerprint(stored), exp) };
  }
  it("guarda la contraseña cifrada", async () => {
    const d = deps();
    expect(await setPasswordWithLink({ ...(await link()), password: "unaclavelarga1", confirm: "unaclavelarga1" }, d)).toEqual({ ok: true });
    expect(d.savePassword).toHaveBeenCalledWith("ana@tp.mx", "hash(unaclavelarga1)");
  });
  it("enlace inválido o de alguien que ya no es ADMIN: no guarda", async () => {
    const d = deps();
    const bad = { ...(await link()), sig: "x" };
    expect(await setPasswordWithLink({ ...bad, password: "unaclavelarga1", confirm: "unaclavelarga1" }, d)).toEqual({ ok: false, error: "El enlace venció o ya se usó. Pide uno nuevo." });
    const d2 = deps({ findUser: vi.fn(async () => ({ ...admin, role: "CLIENT" })) });
    expect((await setPasswordWithLink({ ...(await link()), password: "unaclavelarga1", confirm: "unaclavelarga1" }, d2)).ok).toBe(false);
    expect(d.savePassword).not.toHaveBeenCalled();
  });
  it("contraseña débil: error claro", async () => {
    expect(await setPasswordWithLink({ ...(await link()), password: "corta", confirm: "corta" }, deps())).toMatchObject({ ok: false });
  });
});
