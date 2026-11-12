// Puro · REQ-1296 (P7 = B): dónde se guarda en cPanel cada documento de un proveedor (fuera de public_html).
export const RAIZ_DOCUMENTOS = "proveedores-docs"; // relativa al home de la cuenta cPanel, hermana de public_html
const PERMITIDOS = new Set(["pdf", "pptx", "ppt", "xlsx", "xls", "csv", "docx", "doc", "jpg", "jpeg", "png", "zip"]);

const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/-+/g, "-").replace(/-+\./g, ".").replace(/^[-.]+|[-.]+$/g, "");

// REQ-1296: ruta segura; null si la extensión no es de documento.
export function rutaDocumento(proveedorId: string, fechaIso: string, nombre: string): string | null {
  const base = limpio(nombre.split(/[\\/]/).pop() ?? "").slice(0, 120);
  const ext = base.includes(".") ? base.split(".").pop()! : "";
  const prov = limpio(proveedorId).slice(0, 60);
  if (!base || !prov || !PERMITIDOS.has(ext)) return null;
  return `${RAIZ_DOCUMENTOS}/${prov}/${fechaIso.slice(0, 10)}/${base}`;
}

// REQ-1296: nunca dentro de public_html ni con «..».
export const rutaPrivada = (ruta: string) => !ruta.split("/").some((p) => p === ".." || p === "public_html") && ruta.startsWith(`${RAIZ_DOCUMENTOS}/`);
