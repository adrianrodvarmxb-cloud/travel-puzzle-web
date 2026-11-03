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

/** Dependencias reales para la contraseña del equipo (D1, bcrypt y Resend). */
export async function passwordDeps(): Promise<import("./password").PasswordDeps> {
  const bcrypt = (await import("bcryptjs")).default;
  const { sendEmail } = await import("@/notifications/resend");
  const prisma = getPrisma();
  return {
    now: new Date(),
    secret: process.env.CRON_SECRET ?? "",
    siteUrl: process.env.SITE_URL ?? "",
    findUser: (email) => prisma.user.findUnique({ where: { email }, select: { email: true, name: true, role: true, password: true } }),
    savePassword: async (email, hash) => { await prisma.user.update({ where: { email }, data: { password: hash } }); },
    hash: (p) => bcrypt.hash(p, 10),
    send: (email) => sendEmail({ apiKey: process.env.RESEND_API_KEY ?? "", fetch }, { ...email, from: process.env.EMAIL_FROM ?? "", replyTo: process.env.EMAIL_REPLY_TO }),
  };
}
