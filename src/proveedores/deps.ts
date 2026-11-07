// I/O · arma las dependencias reales (D1, Resend y cPanel) desde el entorno. Solo lo usan las rutas.
import { getPrisma } from "@/lib/prisma";
import { sendEmail } from "@/notifications/resend";
import { createProveedoresRepo, dbDePrisma } from "./repository";
import { subirDocumento } from "./cpanel";
import type { Correo } from "./lib/correo";

// REQ-1291: todo detrás de PROVEEDORES_MILA_ON (apagada hasta que el PO apruebe las plantillas).
export const proveedoresEncendido = (env: Record<string, string | undefined>) => env.PROVEEDORES_MILA_ON === "true";

export function proveedoresDeps(env: Record<string, string | undefined>) {
  const repo = createProveedoresRepo(dbDePrisma(getPrisma() as never));
  const enviar = async (c: Correo) => {
    const id = await sendEmail({ apiKey: env.RESEND_API_KEY ?? "", fetch }, { from: c.from, to: c.to[0], subject: c.subject, text: c.text, html: "", cc: c.cc, replyTo: "comercial@travelpuzzle.com.mx", ...(c.inReplyTo && { headers: { "In-Reply-To": c.inReplyTo, References: c.inReplyTo } }) });
    return `<${id}@resend.dev>`;
  };
  const subir = (ruta: string, contenido: Uint8Array, tipo: string) =>
    subirDocumento({ host: env.CPANEL_HOST ?? "", user: env.CPANEL_USER ?? "", token: env.CPANEL_TOKEN ?? "", fetch }, ruta, contenido, tipo);
  return { repo, enviar, subir };
}
