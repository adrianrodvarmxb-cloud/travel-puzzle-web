/** Arma las dependencias reales del gestor (D1 y R2) para rutas y páginas. */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminFresh } from "./lib/admin";
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

/** true si quien llama tiene rol ADMIN; REQ-1533: el rol se confirma en la base. */
export async function requireAdmin(): Promise<boolean> {
  try {
    return await isAdminFresh(await auth(), async (id) =>
      (await getPrisma().user.findUnique({ where: { id }, select: { role: true } }))?.role ?? null);
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

/** Dependencias reales de la traducción (D1 + Workers AI, binding AI). */
export async function translationDeps() {
  const { TRANSLATION_MODEL } = await import("./translate");
  const repo = tripRepo();
  const prisma = getPrisma();
  const { env } = getCloudflareContext();
  const ai = (env as unknown as { AI?: { run(model: string, input: unknown): Promise<{ response?: unknown }> } }).AI;
  return {
    async load(id: string) {
      const trip = await repo.findById(id);
      if (!trip) return null;
      const row = await prisma.trip.findUnique({ where: { id }, select: { translations: true } });
      return { trip, translations: (row?.translations ?? {}) as import("./lib/translation").Translations };
    },
    async save(id: string, t: import("./lib/translation").Translations) {
      await prisma.trip.update({ where: { id }, data: { translations: t as object } });
    },
    async ai(messages: { role: string; content: string }[]) {
      if (!ai) throw new Error("IA de Cloudflare no conectada (binding AI)");
      const out = await ai.run(TRANSLATION_MODEL, { messages, max_tokens: 4096, temperature: 0.2 });
      return typeof out.response === "string" ? out.response : JSON.stringify(out.response ?? "");
    },
  };
}
