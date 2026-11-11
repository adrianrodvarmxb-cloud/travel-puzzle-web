import { describe, it, expect } from "vitest";
import { requestLoginLink, consumeLoginLink, type LoginDeps } from "./login";
import { signLoginLink, accountFingerprint, LOGIN_LINK_TTL_MS } from "./lib/login-link";

const now = new Date("2026-11-11T20:00:00Z");
function deps(over: Partial<LoginDeps> = {}) {
  const sent: { to: string; html: string; text: string; subject: string }[] = [];
  const users = new Map<string, { id: string; email: string; name: string | null; role: string; updatedAt: Date }>();
  const d: LoginDeps = {
    now, secret: "s3cr3t", siteUrl: "https://travelpuzzle.com.mx", accountsEnabled: true,
    findUser: async (e) => users.get(e) ?? null,
    createUser: async (e) => { const u = { id: "u-" + e, email: e, name: null, role: "CLIENT", updatedAt: new Date(now.getTime() + 1000) }; users.set(e, u); return u; },
    touchUser: async (id) => { for (const u of users.values()) if (u.id === id) u.updatedAt = new Date(u.updatedAt.getTime() + 60000); },
    send: async (m) => { sent.push(m); },
    ...over,
  };
  return { d, sent, users };
}

describe("REQ-1599: pedir el enlace", () => {
  it("REQ-1599: manda el enlace a /mi-cuenta/entrar/verificar con el correo normalizado", async () => {
    const { d, sent } = deps();
    expect(await requestLoginLink(" Ana@X.com ", d)).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@x.com");
    expect(sent[0].text).toMatch(/https:\/\/travelpuzzle\.com\.mx\/mi-cuenta\/entrar\/verificar\?email=ana%40x\.com&exp=\d+&sig=/);
  });
  it("REQ-1599: con cuentas apagadas no manda nada (misma respuesta)", async () => {
    const { d, sent } = deps({ accountsEnabled: false });
    expect(await requestLoginLink("ana@x.com", d)).toBe("sent");
    expect(sent).toHaveLength(0);
  });
  it("REQ-1599: si el envío falla, responde igual y no lanza", async () => {
    const { d } = deps({ send: async () => { throw new Error("resend caído"); } });
    expect(await requestLoginLink("ana@x.com", d)).toBe("sent");
  });
});

describe("REQ-1591: usar el enlace", () => {
  it("REQ-1591: correo nuevo → crea cuenta CLIENT y entra; el mismo enlace ya no sirve", async () => {
    const { d, users } = deps();
    const exp = now.getTime() + LOGIN_LINK_TTL_MS;
    const sig = await signLoginLink("s3cr3t", "ana@x.com", await accountFingerprint(null), exp);
    const u = await consumeLoginLink({ email: "Ana@x.com", exp, sig }, d);
    expect(u).toMatchObject({ email: "ana@x.com", role: "CLIENT" });
    expect(users.size).toBe(1);
    expect(await consumeLoginLink({ email: "ana@x.com", exp, sig }, d)).toBeNull();
  });
  it("REQ-1591: cuenta existente → entra con su rol; luego el enlace se agota", async () => {
    const { d, users } = deps();
    users.set("eq@tp.mx", { id: "a1", email: "eq@tp.mx", name: "Eq", role: "ADMIN", updatedAt: new Date("2026-11-01T00:00:00Z") });
    const exp = now.getTime() + LOGIN_LINK_TTL_MS;
    const sig = await signLoginLink("s3cr3t", "eq@tp.mx", await accountFingerprint("2026-11-01T00:00:00.000Z"), exp);
    expect(await consumeLoginLink({ email: "eq@tp.mx", exp, sig }, d)).toMatchObject({ id: "a1", role: "ADMIN" });
    expect(await consumeLoginLink({ email: "eq@tp.mx", exp, sig }, d)).toBeNull();
  });
  it("REQ-1591: firma mala o cuentas apagadas → no entra ni crea cuenta", async () => {
    const { d, users } = deps();
    const exp = now.getTime() + LOGIN_LINK_TTL_MS;
    expect(await consumeLoginLink({ email: "ana@x.com", exp, sig: "x".repeat(43) }, d)).toBeNull();
    const sig = await signLoginLink("s3cr3t", "ana@x.com", await accountFingerprint(null), exp);
    expect(await consumeLoginLink({ email: "ana@x.com", exp, sig }, { ...d, accountsEnabled: false })).toBeNull();
    expect(users.size).toBe(0);
  });
});
