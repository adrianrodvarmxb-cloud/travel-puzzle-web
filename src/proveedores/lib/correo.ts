// Puro · REQ-1294 (P1 C, P2 B, P3): el correo que manda Mila. Plantillas en docs/proveedores/plantillas-correo.md.
import { BLOQUEADOS } from "./identificar";

export const REMITENTE = "Mila · Travel Puzzle <comercial@travelpuzzle.com.mx>";
export const COPIAS = ["claulet@travelpuzzle.com.mx", "adrianrodvar@travelpuzzle.com.mx"];
export const FIRMA = "Mila\nDel equipo de Travel Puzzle\ncomercial@travelpuzzle.com.mx · +52 55 3649 0320 · travelpuzzle.com.mx";
export const FIRMA_EN = "Mila\nTravel Puzzle team\ncomercial@travelpuzzle.com.mx · +52 55 3649 0320 · travelpuzzle.com.mx";

export interface Correo { from: string; to: string[]; cc: string[]; subject: string; text: string; inReplyTo?: string }

// REQ-1294: rellena {campos}; una línea con un campo vacío no sale (nunca se inventa un dato).
export function rellenar(plantilla: string, datos: Record<string, string | undefined>): string {
  return plantilla
    .split("\n")
    .filter((l) => [...l.matchAll(/\{([a-z_]+)\}/g)].every((m) => (datos[m[1]] ?? "").trim() !== ""))
    .map((l) => l.replace(/\{([a-z_]+)\}/g, (_, k) => String(datos[k]).trim()))
    .join("\n");
}

// REQ-1294
export function armarCorreo(p: { para: string[]; asunto: string; cuerpo: string; idioma?: "es" | "en"; inReplyTo?: string }): Correo | null {
  const para = p.para.map((x) => x.trim().toLowerCase()).filter((x) => x.includes("@"));
  if (!para.length || para.some((x) => BLOQUEADOS.test(x.split("@")[1]))) return null;
  if (!p.asunto.trim() || /\{[a-z_]+\}/.test(p.asunto)) return null;
  const firma = p.idioma === "en" ? FIRMA_EN : FIRMA;
  return { from: REMITENTE, to: para, cc: [...COPIAS], subject: p.asunto, text: `${p.cuerpo.trim()}\n\n${firma}`, inReplyTo: p.inReplyTo };
}
