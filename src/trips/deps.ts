/** Arma las dependencias reales del gestor (D1 y R2) para rutas y páginas. */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "./lib/admin";
import { createTripRepo } from "./repository";

export const tripRepo = () => createTripRepo(getPrisma());

interface R2Like {
  put(key: string, body: ArrayBuffer, opts: { httpMetadata: { contentType: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
}

/** Bucket de fotos (binding TRIP_IMAGES), o null si aún no está conectado. */
export function tripImagesBucket(): R2Like | null {
  const { env } = getCloudflareContext();
  return ((env as unknown as { TRIP_IMAGES?: R2Like }).TRIP_IMAGES) ?? null;
}

/** true si quien llama tiene rol ADMIN. */
export async function requireAdmin(): Promise<boolean> {
  try {
    return isAdmin(await auth());
  } catch {
    return false;
  }
}
