// Puro · REQ-1291: a qué proveedor pertenece un correo, por dirección exacta o por dominio propio.
export interface ContactoProveedor { id: string; correos: string[]; dominios: string[]; bloqueado?: boolean }

const PUBLICOS = new Set(["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.mx", "icloud.com"]);
const INTERNOS = /(^|\.)travelpuzzle\.com(\.mx)?$/;
export const BLOQUEADOS = /(^|\.)freetour\.com$/; // REQ-1294: FREETOUR nunca entra a este flujo (B3)

const dominio = (c: string) => c.toLowerCase().split("@")[1] ?? "";

// REQ-1291: busca entre remitente y destinatarios externos; un dominio público solo cuenta por dirección exacta.
export function proveedorDeCorreo(direcciones: string[], proveedores: ContactoProveedor[]): string | null {
  const externos = direcciones.map((d) => d.trim().toLowerCase()).filter((d) => d.includes("@") && !INTERNOS.test(dominio(d)));
  for (const c of externos) {
    if (BLOQUEADOS.test(dominio(c))) return null;
    const exacto = proveedores.find((p) => !p.bloqueado && p.correos.some((x) => x.toLowerCase() === c));
    if (exacto) return exacto.id;
  }
  for (const c of externos) {
    const d = dominio(c);
    if (PUBLICOS.has(d)) continue;
    const porDominio = proveedores.find((p) => !p.bloqueado && p.dominios.some((x) => d === x || d.endsWith(`.${x}`)));
    if (porDominio) return porDominio.id;
  }
  return null;
}
