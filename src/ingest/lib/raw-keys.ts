/**
 * REQ-541: claves del bucket PRIVADO del archivo crudo (binding propuesto RAW_ARCHIVE, gate 1). Pura.
 *   raw/<proveedor>/<externalId>/<huella>.json      copia exacta de cada item, una por huella
 *   source/<agencia>/<huella8>-<archivo>             documento original del proveedor (PDF o página web, gate 4)
 * La huella en la clave hace cada objeto inmutable: reescribir la misma clave escribe los mismos bytes.
 */
const PROVIDER = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SHA = /^[0-9a-f]{64}$/;

/** Un segmento de ruta seguro: lo que no sea [A-Za-z0-9._-] se codifica; "." y ".." también. */
// REQ-541
export function safeSegment(s: string): string {
  if (s === "." || s === "..") return s.replace(/\./g, "%2E");
  return s.replace(/[^A-Za-z0-9._-]/g, (c) => encodeURIComponent(c).replace(/[!'()*]/g, (x) => `%${x.charCodeAt(0).toString(16).toUpperCase()}`));
}

function check(provider: string, hash: string) {
  if (!PROVIDER.test(provider)) throw new Error(`proveedor inválido: ${provider}`);
  if (!SHA.test(hash)) throw new Error(`huella inválida: ${hash}`);
}

// REQ-541
export function rawKey(provider: string, externalId: string | number | null | undefined, hash: string): string {
  check(provider, hash);
  const id = externalId === null || externalId === undefined || externalId === "" ? "_sin-id" : safeSegment(String(externalId));
  return `raw/${provider}/${id}/${hash}.json`;
}

/** Nombre de archivo legible a partir de un nombre o de una URL (la URL se guarda como .html). */
function fileName(nameOrUrl: string): string {
  let base = nameOrUrl.trim();
  let ext = "";
  if (/^https?:\/\//i.test(base)) {
    base = base.replace(/^https?:\/\//i, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
    ext = ".html";
  } else {
    base = base.split(/[\\/]/).pop() ?? base;
    const m = /(\.[A-Za-z0-9]{1,5})$/.exec(base);
    if (m) { ext = m[1].toLowerCase(); base = base.slice(0, -m[1].length); }
  }
  const slug = base.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  return `${slug || "documento"}${ext}`;
}

// REQ-541
export function sourceKey(agency: string, nameOrUrl: string, hash: string): string {
  check(agency, hash);
  return `source/${agency}/${hash.slice(0, 8)}-${fileName(nameOrUrl)}`;
}

/** true si la clave pertenece al archivo crudo (nunca se sirve al público, REQ-547). */
export function isArchiveKey(key: string): boolean {
  return /^(raw|source)\//.test(key);
}
