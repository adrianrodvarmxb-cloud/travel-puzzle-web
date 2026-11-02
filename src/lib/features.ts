/**
 * Interruptores de funciones que aún no están listas para clientes.
 * Lo que no está terminado no se muestra (nada de fachadas).
 *
 * ACCOUNTS_ENABLED: cuentas de cliente (iniciar sesión, registro, alta rápida
 * y el programa Puzzle Rewards). Hoy /login falla y Rewards no existe, así que va apagado.
 */
export const ACCOUNTS_ENABLED = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true";
