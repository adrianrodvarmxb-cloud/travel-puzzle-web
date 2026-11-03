/** Fotos de viajes en Cloudflare R2 (gate F): validación y nombres. Puro. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const IMAGE_KEY_RE = /^trips\/\d+-[a-z0-9]+\.(jpg|png|webp)$/;

export function checkImage(f: { type: string; size: number }): string | null {
  if (!EXT[f.type]) return "Sube la foto en JPG, PNG o WebP.";
  if (f.size > MAX_IMAGE_BYTES) return "La foto pesa más de 5 MB.";
  return null;
}

/** Llave generada por nosotros (nunca el nombre del archivo del usuario). */
export function imageKey(type: string, now: number, random: string): string {
  return `trips/${now}-${random.toLowerCase().replace(/[^a-z0-9]/g, "")}.${EXT[type]}`;
}

export function imageUrl(key: string): string {
  return `/api/viajes/foto/${key}`;
}
