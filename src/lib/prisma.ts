import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Prisma sobre Cloudflare D1.
 *
 * En Workers la base llega como binding (env.DB) en cada petición, así que el
 * cliente se crea por base y se reutiliza. `prisma` se conserva como export
 * para no tocar el código que ya lo usa: cada acceso resuelve el cliente de la
 * petición en curso.
 */
const clients = new WeakMap<object, PrismaClient>()

export function getPrisma(): PrismaClient {
  const { env } = getCloudflareContext()
  const db = (env as unknown as { DB: ConstructorParameters<typeof PrismaD1>[0] }).DB
  let client = clients.get(db)
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(db) })
    clients.set(db, client)
  }
  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
