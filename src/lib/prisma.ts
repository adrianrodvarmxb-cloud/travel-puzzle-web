import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { hiddenProviders, providerExtension, type ProviderVisibilityEnv } from '@/catalog/lib/provider-visibility'

/**
 * Prisma sobre Cloudflare D1.
 *
 * En Workers la base llega como binding (env.DB) en cada petición, así que el
 * cliente se crea por base y se reutiliza. `prisma` se conserva como export
 * para no tocar el código que ya lo usa: cada acceso resuelve el cliente de la
 * petición en curso.
 */
const clients = new WeakMap<object, { crudo: PrismaClient; publico: PrismaClient }>()

/**
 * Candado 1 del gate C (REQ-1625, REQ-3311): el único punto donde se decide qué proveedores ve el
 * público. Toda lectura de `Tour` por Prisma pasa por aquí, así que una página nueva queda cubierta
 * sin acordarse de nada. El sync pide el cliente crudo a propósito (`todosLosProveedores`).
 */
// REQ-3311
function conFiltroDeProveedor(client: PrismaClient, env: ProviderVisibilityEnv): PrismaClient {
  if (!hiddenProviders(env).length) return client
  return client.$extends(providerExtension(env) as never) as unknown as PrismaClient
}

export function getPrisma(opciones?: { todosLosProveedores?: boolean }): PrismaClient {
  const { env } = getCloudflareContext()
  const db = (env as unknown as { DB: ConstructorParameters<typeof PrismaD1>[0] }).DB
  let par = clients.get(db)
  if (!par) {
    const crudo = new PrismaClient({ adapter: new PrismaD1(db) })
    par = { crudo, publico: conFiltroDeProveedor(crudo, env as ProviderVisibilityEnv) }
    clients.set(db, par)
  }
  return opciones?.todosLosProveedores ? par.crudo : par.publico
}

/** Binding de D1 de la petición en curso (para guardados en lote). */
export function getD1() {
  const { env } = getCloudflareContext()
  return (env as unknown as { DB: import('@/lib/d1/batch').D1Like }).DB
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
