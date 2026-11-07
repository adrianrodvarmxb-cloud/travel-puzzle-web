// Puro · REQ-1330: una respuesta automática o un rebote no cuentan como respuesta del proveedor.
export type TipoEntrante = "persona" | "automatica" | "rebote";

const AUTO_ASUNTO = /(fuera de (la )?oficina|respuesta autom[aá]tica|auto(matic)?[- ]?reply|out of (the )?office|autoreply|vacaciones|on vacation|acuse de recibo|we (have )?received your (e-?mail|message))/i;
const REBOTE_DE = /^(mailer-daemon|postmaster|mail-?delivery)/i;
const REBOTE_ASUNTO = /(undeliver|delivery status notification|returned mail|mail delivery (failed|subsystem)|no se pudo entregar|failure notice)/i;

// REQ-1330: decide si un correo lo escribió una persona.
export function tipoEntrante(c: { de: string; asunto: string; encabezados?: Record<string, string> }): TipoEntrante {
  const h = Object.fromEntries(Object.entries(c.encabezados ?? {}).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]));
  if (REBOTE_DE.test(c.de) || REBOTE_ASUNTO.test(c.asunto) || (h["content-type"] ?? "").includes("delivery-status")) return "rebote";
  if ((h["auto-submitted"] && h["auto-submitted"] !== "no") || "x-autoreply" in h || "x-autorespond" in h
    || ["auto_reply", "bulk", "junk"].includes(h["precedence"] ?? "") || AUTO_ASUNTO.test(c.asunto)) return "automatica";
  return "persona";
}

// REQ-1330: las direcciones que rebotaron, sacadas del texto del aviso (las que estén en la lista de destinos conocidos).
export function direccionesRebotadas(texto: string, conocidas: string[]): string[] {
  const t = texto.toLowerCase();
  return conocidas.map((x) => x.toLowerCase()).filter((x) => t.includes(x));
}
