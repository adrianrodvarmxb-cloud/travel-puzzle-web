/** Solo las cuentas con rol ADMIN entran al gestor de viajes (gate B). */
export function isAdmin(session: { user?: { role?: string } | null } | null | undefined): boolean {
  return session?.user?.role === "ADMIN";
}
