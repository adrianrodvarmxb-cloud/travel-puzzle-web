/** Dependencias reales del formulario de contacto (Resend). Las rutas solo arman esto y llaman al dominio. */
import type { ContactDeps } from "./send";

export async function contactDeps(env: Record<string, string | undefined>, enabled: boolean): Promise<ContactDeps> {
  const { sendEmail } = await import("@/notifications/resend");
  const apiKey = env.RESEND_API_KEY ?? "";
  return {
    // Sin llave de Resend o sin remitente no hay envío: la ruta responde «no disponible» y la página ofrece WhatsApp.
    enabled: enabled && !!apiKey && !!env.EMAIL_FROM,
    teamInbox: (env.EMAIL_REPLY_TO ?? "").trim(),
    send: (m) => sendEmail({ apiKey, fetch }, { ...m, from: env.EMAIL_FROM ?? "" }),
    log: (line) => console.error(line),
  };
}
