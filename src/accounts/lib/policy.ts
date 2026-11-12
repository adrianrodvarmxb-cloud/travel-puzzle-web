import { z } from "zod";

/** REQ-1592: el registro viejo con contraseña queda apagado (los clientes entran con enlace o Google). Reversible. */
export const PASSWORD_SIGNUP_ENABLED = false;

/** REQ-1592: la contraseña solo deja entrar a cuentas del equipo. */
export function passwordLoginAllowed(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

/** REQ-1594: nombre visible de la cuenta. */
export const accountNameSchema = z.string().trim().min(1).max(80);

/** REQ-1596: la invitación «Guarda tus reservas en tu cuenta» sale solo con cuentas encendidas y sin sesión. */
export function showAccountInvite(o: { accountsEnabled: boolean; signedIn: boolean }): boolean {
  return o.accountsEnabled && !o.signedIn;
}
