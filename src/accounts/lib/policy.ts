import { z } from "zod";

/** REQ-1592: viven en `password.ts` (sin zod, REQ-10865); se re-exportan aquí para no cambiar a quien ya las usa. */
export { PASSWORD_SIGNUP_ENABLED, passwordLoginAllowed } from "./password";

/** REQ-1594: nombre visible de la cuenta. */
export const accountNameSchema = z.string().trim().min(1).max(80);

/** REQ-1596: la invitación «Guarda tus reservas en tu cuenta» sale solo con cuentas encendidas y sin sesión. */
export function showAccountInvite(o: { accountsEnabled: boolean; signedIn: boolean }): boolean {
  return o.accountsEnabled && !o.signedIn;
}
