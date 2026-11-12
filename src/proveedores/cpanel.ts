// I/O · REQ-1296 (P7 = B): sube un documento a cPanel con la API UAPI (Fileman::upload_files), fuera de public_html.
// Credenciales: CPANEL_HOST, CPANEL_USER y el secreto CPANEL_TOKEN, que carga el PO en Cloudflare (nunca por chat).
import { rutaPrivada } from "./lib/documentos";

export interface CpanelConfig { host: string; user: string; token: string; fetch: typeof fetch }

export async function subirDocumento(cfg: CpanelConfig, ruta: string, contenido: Uint8Array, tipo = "application/octet-stream"): Promise<void> {
  if (!rutaPrivada(ruta)) throw new Error("ruta fuera de la carpeta privada");
  const dir = ruta.slice(0, ruta.lastIndexOf("/"));
  const nombre = ruta.slice(ruta.lastIndexOf("/") + 1);
  const auth = { Authorization: `cpanel ${cfg.user}:${cfg.token}` };
  const base = `https://${cfg.host}:2083/execute`;
  // Crea cada nivel de la carpeta (si ya existe, cPanel responde con error y se ignora).
  const partes = dir.split("/");
  for (let i = 0; i < partes.length; i++) {
    const padre = partes.slice(0, i).join("/") || ".";
    await cfg.fetch(`${base}/Fileman/mkdir?path=${encodeURIComponent(padre)}&name=${encodeURIComponent(partes[i])}`, { headers: auth }).catch(() => undefined);
  }
  const form = new FormData();
  form.append("dir", dir);
  form.append("overwrite", "0");
  // REQ-1562: copia a un ArrayBuffer propio; Blob no acepta Uint8Array<ArrayBufferLike> (SharedArrayBuffer) y el build se caía en la revisión de tipos.
  form.append("file-1", new Blob([new Uint8Array(contenido)], { type: tipo }), nombre);
  const res = await cfg.fetch(`${base}/Fileman/upload_files`, { method: "POST", headers: auth, body: form });
  const json = (await res.json().catch(() => null)) as { status?: number; errors?: string[] } | null;
  if (!res.ok || json?.status !== 1) throw new Error(`cPanel ${res.status}: ${json?.errors?.join("; ") ?? "sin detalle"}`);
}
