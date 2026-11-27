/**
 * REQ-1592: reglas de contraseña sin dependencias, para que el cliente (Navbar) no arrastre zod (REQ-10865).
 * `policy.ts` las re-exporta: quien ya las importaba de ahí no cambia.
 */

/** REQ-1592: el registro viejo con contraseña queda apagado (los clientes entran con enlace o Google). Reversible. */
export const PASSWORD_SIGNUP_ENABLED = false;

/** REQ-1592: la contraseña solo deja entrar a cuentas del equipo. */
export function passwordLoginAllowed(role: string | null | undefined): boolean {
  return role === "ADMIN";
}
