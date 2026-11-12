/**
 * REQ-1599/REQ-1591: entrar a la cuenta de cliente con un enlace al correo. Dependencias por parámetro.
 * La respuesta al pedir el enlace es la misma exista o no la cuenta (no revela correos).
 */
import { accountFingerprint, signLoginLink, verifyLoginLink, LOGIN_LINK_TTL_MS, normEmail } from "./lib/login-link";
import { buildLoginLinkEmail } from "./lib/login-email";

export interface AccountUser { id: string; email: string; name: string | null; role: string; updatedAt: Date }

export interface LoginDeps {
  now: Date;
  secret: string;
  siteUrl: string;
  accountsEnabled: boolean;
  findUser(email: string): Promise<AccountUser | null>;
  createUser(email: string): Promise<AccountUser>;
  /** Marca la cuenta como actualizada (agota los enlaces ya enviados). */
  touchUser(id: string): Promise<void>;
  send(email: { to: string; subject: string; html: string; text: string }): Promise<unknown>;
}

const fp = (u: AccountUser | null) => accountFingerprint(u ? u.updatedAt.toISOString() : null);

// REQ-1599
export async function requestLoginLink(rawEmail: string, d: LoginDeps): Promise<"sent"> {
  if (!d.accountsEnabled) return "sent";
  const email = normEmail(rawEmail);
  try {
    const exp = d.now.getTime() + LOGIN_LINK_TTL_MS;
    const sig = await signLoginLink(d.secret, email, await fp(await d.findUser(email)), exp);
    const base = d.siteUrl.replace(/\/+$/, "");
    const url = `${base}/mi-cuenta/entrar/verificar?email=${encodeURIComponent(email)}&exp=${exp}&sig=${sig}`;
    await d.send({ to: email, ...buildLoginLinkEmail({ url, logoUrl: `${base}/brand/logo-tp-oscuro.png` }) });
  } catch (error) {
    console.error("[cuenta] no se envió el enlace para entrar:", (error as Error).message);
  }
  return "sent";
}

// REQ-1591
export async function consumeLoginLink(q: { email: string; exp: number; sig: string }, d: LoginDeps): Promise<AccountUser | null> {
  if (!d.accountsEnabled) return null;
  const email = normEmail(q.email);
  const user = await d.findUser(email);
  if (!(await verifyLoginLink(d.secret, email, await fp(user), Number(q.exp), q.sig, d.now))) return null;
  if (!user) return d.createUser(email);
  await d.touchUser(user.id);
  return user;
}
