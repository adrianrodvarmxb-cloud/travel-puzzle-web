/**
 * Candado 1 del gate C (REQ-1625, REQ-3311): un solo punto decide qué proveedores ve el público.
 *
 * Modelo de los referentes (Viator, GetYourGuide): la copia local del catálogo está completa y el
 * filtro vive en quien sirve las consultas, no en el estado de cada producto. Así, al encender la
 * bandera del proveedor sus tours aparecen sin recargar ni tocar datos de producción.
 *
 * Puro: recibe el entorno por parámetro (DIP). No importa Prisma ni D1.
 */

export interface ProviderVisibilityEnv {
  TANGOL_ENABLED?: string;
}

/** Proveedores que siguen tras su bandera. Al agregar uno nuevo, se suma aquí y en ningún otro lado. */
const TRAS_BANDERA: readonly { providerId: string; encendida: (env: ProviderVisibilityEnv) => boolean }[] = [
  { providerId: "tangol", encendida: (env) => env.TANGOL_ENABLED === "true" },
];

const SEGURO = /^[A-Za-z0-9_]+$/;
const SEGURO_PROVEEDOR = /^[a-z0-9_-]+$/;

/** Proveedores que el público no debe ver ahora mismo. */
// REQ-3311
export function hiddenProviders(env: ProviderVisibilityEnv): string[] {
  return TRAS_BANDERA.filter((p) => !p.encendida(env)).map((p) => p.providerId);
}

/** Fragmento de `where` de Prisma para cualquier lectura de Tour del público. */
// REQ-3311
export function providerWhere(env: ProviderVisibilityEnv): { providerId?: { notIn: string[] } } {
  const ocultos = hiddenProviders(env);
  return ocultos.length ? { providerId: { notIn: ocultos } } : {};
}

/** Lo mismo para las consultas en SQL crudo (FTS, destinos, inicio). `tabla` es la tabla o su alias. */
// REQ-3311
export function providerSql(env: ProviderVisibilityEnv, tabla = "Tour"): string {
  if (!SEGURO.test(tabla.replace(/^"|"$/g, ""))) throw new Error(`[catalogo] tabla o alias inválido: ${tabla}`);
  const ocultos = hiddenProviders(env);
  if (!ocultos.length) return "";
  for (const p of ocultos) if (!SEGURO_PROVEEDOR.test(p)) throw new Error(`[catalogo] proveedor inválido: ${p}`);
  return ` AND "${tabla}"."providerId" NOT IN (${ocultos.map((p) => `'${p}'`).join(", ")})`;
}

/** Operaciones de lectura a las que se les pega el filtro (las escrituras no se tocan). */
// REQ-3311
export const READ_OPERATIONS = [
  "findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy",
] as const;

/** Pega el filtro de proveedor al `where` que ya traía la consulta, sin perder lo suyo. */
// REQ-3311
export function withProviderFilter<T extends { where?: unknown }>(args: T, env: ProviderVisibilityEnv): T {
  const extra = providerWhere(env);
  if (!extra.providerId) return args;
  const where = (args?.where ?? {}) as Record<string, unknown>;
  // Si la consulta ya pide un proveedor en concreto, manda ella: el sync y las fichas internas siguen funcionando.
  if ("providerId" in where) return args;
  return { ...args, where: { ...where, ...extra } };
}

export interface ExtensionArgs { operation: string; args: unknown; query: (args: unknown) => unknown }

/**
 * Especificación de la extensión de Prisma que esconde a los proveedores tras bandera.
 * Pura y sin importar Prisma, para poder probarla sin base: `src/lib/prisma.ts` solo la entrega a `$extends`.
 */
// REQ-3311
export function providerExtension(env: ProviderVisibilityEnv) {
  const lecturas = new Set<string>(READ_OPERATIONS);
  return {
    name: "visibilidad-por-proveedor",
    query: {
      tour: {
        $allOperations({ operation, args, query }: ExtensionArgs) {
          if (!lecturas.has(operation)) return query(args);
          return query(withProviderFilter(args as { where?: unknown }, env));
        },
      },
    },
  };
}
