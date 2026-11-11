/** Solo las cuentas con rol ADMIN entran al gestor de viajes (gate B). */
export function isAdmin(session: { user?: { role?: string } | null } | null | undefined): boolean {
  return session?.user?.role === "ADMIN";
}

export type GoogleSignInDecision = "allow" | "create" | "deny";

/** REQ-1532: con cuentas de cliente apagadas, Google solo deja entrar a cuentas que ya existen (no crea nuevas). */
export function googleSignInDecision(o: { exists: boolean; accountsEnabled: boolean }): GoogleSignInDecision {
  if (o.exists) return "allow";
  return o.accountsEnabled ? "create" : "deny";
}

/** REQ-1533: la sesión dice ADMIN y la base lo confirma (quitar el rol surte efecto al momento). */
export async function isAdminFresh(
  session: { user?: { id?: string; role?: string } | null } | null | undefined,
  roleOf: (id: string) => Promise<string | null>,
): Promise<boolean> {
  const id = session?.user?.id;
  if (!isAdmin(session) || !id) return false;
  return (await roleOf(id)) === "ADMIN";
}
