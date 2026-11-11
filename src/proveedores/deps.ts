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
  // REQ-1568, REQ-1570: el sitio no tiene WhatsApp; le pide a Mila (zoefel-mila) que mande el aviso desde el número de Travel Puzzle.
  const avisar = async (numero: string, texto: string) => {
    const res = await fetch(env.MILA_AVISOS_URL ?? "", { method: "POST", headers: { authorization: `Bearer ${env.MILA_AVISOS_SECRET ?? ""}`, "content-type": "application/json" },
      body: JSON.stringify({ negocio: "travel-puzzle", numero, texto, plantilla: "resumen_proveedores" }) });
    if (!res.ok) throw new Error(`avisos ${res.status}`);
  };
  const destinos = (env.RESUMEN_DESTINOS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return { repo, enviar, subir, avisar, destinos };
}
