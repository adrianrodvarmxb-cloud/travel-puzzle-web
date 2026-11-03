/**
 * Contraseña del equipo para el gestor: pedir el enlace por correo y guardarla.
 * Solo cuentas ADMIN; la respuesta es la misma exista o no la cuenta. Dependencias por parámetro.
 */
import { isAdmin } from "./lib/admin";
import { passwordFingerprint, signPasswordLink, verifyPasswordLink, checkNewPassword, PASSWORD_LINK_TTL_MS } from "./lib/password-link";
import { buildPasswordLinkEmail } from "./lib/password-email";

interface StoredUser { email: string; name: string | null; role: string; password: string | null }

export interface PasswordDeps {
  now: Date;
  secret: string;
  siteUrl: string;
  findUser(email: string): Promise<StoredUser | null>;
  savePassword(email: string, hash: string): Promise<void>;
  hash(password: string): Promise<string>;
  send(email: { to: string; subject: string; html: string; text: string }): Promise<unknown>;
}

const norm = (email: string) => email.trim().toLowerCase();

export async function requestPasswordLink(rawEmail: string, d: PasswordDeps): Promise<"sent"> {
  const email = norm(rawEmail);
  const user = await d.findUser(email);
  if (!user || !isAdmin({ user })) return "sent";
  try {
    const exp = d.now.getTime() + PASSWORD_LINK_TTL_MS;
    const sig = await signPasswordLink(d.secret, email, await passwordFingerprint(user.password), exp);
    const url = `${d.siteUrl.replace(/\/+$/, "")}/admin/contrasena?email=${encodeURIComponent(email)}&exp=${exp}&sig=${sig}`;
    await d.send({ to: email, ...buildPasswordLinkEmail({ name: user.name, url, logoUrl: `${d.siteUrl.replace(/\/+$/, "")}/brand/logo-tp-oscuro.png` }) });
  } catch (error) {
    console.error("[gestor] no se envió el enlace de contraseña:", (error as Error).message);
  }
  return "sent";
}

const EXPIRED = "El enlace venció o ya se usó. Pide uno nuevo.";

export async function setPasswordWithLink(
  q: { email: string; exp: number; sig: string; password: string; confirm: string },
  d: PasswordDeps
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = norm(q.email);
  const user = await d.findUser(email);
  if (!user || !isAdmin({ user })) return { ok: false, error: EXPIRED };
  if (!(await verifyPasswordLink(d.secret, email, await passwordFingerprint(user.password), q.exp, q.sig, d.now))) return { ok: false, error: EXPIRED };
  const problem = checkNewPassword(q.password, q.confirm);
  if (problem) return { ok: false, error: problem };
  await d.savePassword(email, await d.hash(q.password));
  return { ok: true };
}
