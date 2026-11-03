/** Subir una foto de viaje a Cloudflare R2. El almacén llega por parámetro. */
import { checkImage, imageKey, imageUrl } from "./lib/image";

interface Deps {
  /** null si el bucket aún no está conectado. */
  put: ((key: string, body: ArrayBuffer, contentType: string) => Promise<unknown>) | null;
  now: () => number;
  random: () => string;
}

export async function uploadTripImage(
  file: { type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> },
  d: Deps
): Promise<{ ok: true; key: string; url: string } | { ok: false; error: string }> {
  if (!d.put) return { ok: false, error: "El almacén de fotos aún no está configurado" };
  const problem = checkImage(file);
  if (problem) return { ok: false, error: problem };
  const key = imageKey(file.type, d.now(), d.random());
  await d.put(key, await file.arrayBuffer(), file.type);
  return { ok: true, key, url: imageUrl(key) };
}
