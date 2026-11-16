// I/O · manda al PO el aviso de tipos nuevos (REQ-10730, regla REQ-10698). Recibe los canales por parámetro; nunca los importa.
// Todo tras `AVISO_TIPO_NUEVO_ENABLED` (REQ-10731): apagada, solo deja constancia en el log y no manda nada.
import { textoAvisoTipoNuevo, type TipoNuevo } from "./lib/tipo-nuevo";

export interface DepsAvisoTipoNuevo {
  encendido: boolean;
  hoy: string;
  /** Correo al PO (Resend). Sin canal configurado, se omite y se dice en el resultado. */
  correo?: (c: { asunto: string; texto: string }) => Promise<void>;
  /** WhatsApp al PO por el puente de Mila (REQ-1663). Sin canal configurado, se omite. */
  whatsapp?: (texto: string) => Promise<void>;
  log?: (linea: string) => void;
}

export interface ResultadoAviso { tipos: number; canales: string[]; omitidos: string[]; errores: string[] }

// REQ-10730, REQ-10731
export async function avisarTipoNuevo(tipos: readonly TipoNuevo[], deps: DepsAvisoTipoNuevo): Promise<ResultadoAviso> {
  const log = deps.log ?? (() => {});
  const r: ResultadoAviso = { tipos: tipos.length, canales: [], omitidos: [], errores: [] };
  if (tipos.length === 0) return r;
  const aviso = textoAvisoTipoNuevo(tipos, { hoy: deps.hoy });
  if (!deps.encendido) {
    log(`AVISO_TIPO_NUEVO_ENABLED apagada: no se manda el aviso de ${tipos.length} tipo(s) nuevo(s). Asunto que saldría: ${aviso.asunto}`);
    r.omitidos.push("bandera apagada");
    return r;
  }
  const canales: [string, (() => Promise<void>) | undefined][] = [
    ["correo", deps.correo && (() => deps.correo!({ asunto: aviso.asunto, texto: aviso.texto }))],
    ["whatsapp", deps.whatsapp && (() => deps.whatsapp!(aviso.whatsapp))],
  ];
  for (const [nombre, manda] of canales) {
    if (!manda) { r.omitidos.push(`${nombre} sin configurar`); continue; }
    try { await manda(); r.canales.push(nombre); }
    catch (e) { r.errores.push(`${nombre}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  return r;
}

/** Canales reales desde el entorno (Actions o Worker). Sin variables, sin canal: el aviso se omite y queda en el log. */
// REQ-10730
/** REQ-10744: lista de correos de `AVISO_PO_EMAIL` (separados por coma o punto y coma), sin vacíos ni repetidos. */
export function destinatarios(valor: string | undefined): string[] {
  return [...new Set((valor ?? "").split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
}

export function avisoTipoNuevoDeps(
  env: Record<string, string | undefined>,
  io: { fetch: typeof fetch; sendEmail: (o: { apiKey: string; fetch: typeof fetch }, e: { from: string; to: string; subject: string; text: string; html: string }) => Promise<string>; hoy?: string; log?: (l: string) => void },
): DepsAvisoTipoNuevo {
  const encendido = env.AVISO_TIPO_NUEVO_ENABLED === "true";
  const correo = env.RESEND_API_KEY && destinatarios(env.AVISO_PO_EMAIL).length > 0
    ? async (c: { asunto: string; texto: string }) => {
        // REQ-10744: varios destinatarios separados por coma; uno por envío, y uno que falla no detiene a los demás.
        const destinos = destinatarios(env.AVISO_PO_EMAIL);
        const r = await Promise.allSettled(destinos.map((to) =>
          io.sendEmail({ apiKey: env.RESEND_API_KEY!, fetch: io.fetch }, { from: env.AVISO_FROM ?? "Travel Puzzle <no-reply@travelpuzzle.com.mx>", to, subject: c.asunto, text: c.texto, html: "" })));
        const fallos = r.filter((x) => x.status === "rejected").length;
        if (fallos > 0) io.log?.(`[aviso-tipo-nuevo] correo: ${fallos} de ${destinos.length} destinatarios fallaron`);
        if (fallos === destinos.length) throw new Error("el correo falló para todos los destinatarios");
      }
    : undefined;
  const numero = env.AVISO_PO_WHATSAPP || (env.RESUMEN_DESTINOS ?? "").split(",").map((x) => x.trim()).filter(Boolean)[0];
  const whatsapp = env.MILA_AVISOS_URL && numero
    ? async (texto: string) => {
        const res = await io.fetch(env.MILA_AVISOS_URL!, { method: "POST", headers: { authorization: `Bearer ${env.MILA_AVISOS_SECRET ?? ""}`, "content-type": "application/json" },
          body: JSON.stringify({ negocio: "travel-puzzle", numero, texto, plantilla: "resumen_proveedores" }) });
        if (!res.ok) throw new Error(`avisos ${res.status}`);
      }
    : undefined;
  return { encendido, hoy: io.hoy ?? new Date().toISOString().slice(0, 10), correo, whatsapp, log: io.log };
}
