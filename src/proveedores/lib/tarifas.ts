// Puro · REQ-1579 (cl. 8.2): cambio de tarifa avisado por un proveedor. Lo confirma el PO (REQ-1574); su confirmación
// detona: respuesta «quedamos enterados», anexo actualizado y precio recalculado (REQ-1581: si el neto baja, baja).
// Sin fecha de vigencia, Mila la pide al proveedor antes de avisar (REQ-1582).
import { sellPrice, type MarkupKind, type MarkupRates } from "../../trips/lib/markup";

export type Moneda = "USD" | "EUR" | "MXN";
export interface CambioLeido { netoAntes?: number; netoNuevo?: number; moneda?: Moneda; desde?: string }
export type EstadoAviso = "falta_fecha" | "falta_monto" | "por_confirmar" | "confirmado" | "aplicado" | "descartado";

const PALABRA_TARIFA = /\b(tarifa|tarifas|precio|precios|rate|rates|price|prices|tariff|tarifario)\b/i;
const PALABRA_CAMBIO = /\b(ahora|now|cambi|sub|baj|aument|ajust|actualiz|nuev|increas|decreas|updat|chang|adjust|new)\w*/i;

// REQ-1579: ¿el correo avisa un cambio de tarifa?
export const pareceCambioTarifa = (asunto: string, texto: string) => {
  const t = `${asunto}\n${texto}`;
  return PALABRA_TARIFA.test(t) && PALABRA_CAMBIO.test(t) && /\d/.test(t);
};

const num = (s: string) => Number(s.replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
const MONEDA = /(USD|US\$|EUR|€|MXN|\$)/i;
const monedaDe = (s?: string): Moneda | undefined => {
  if (!s) return undefined;
  if (/eur|€/i.test(s)) return "EUR";
  if (/mxn/i.test(s)) return "MXN";
  return "USD";
};

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// REQ-1582: fecha de vigencia; si no trae año, la siguiente fecha desde hoy. Nunca la inventa.
export function leerFecha(texto: string, hoy: string): string | undefined {
  const t = texto.toLowerCase();
  const isoM = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoM) return iso(+isoM[1], +isoM[2], +isoM[3]);
  const es = t.match(/(?:a partir del?|desde el|vigente desde el|efectiv[oa] (?:a partir )?del?)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de|del)\s+(20\d{2}))?/);
  const en = t.match(/(?:from|as of|effective(?: from)?|starting)\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?/);
  const dmy = t.match(/(?:a partir del?|desde el|from|as of|effective)\s+(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
  let d: number | undefined, m: number | undefined, y: number | undefined;
  if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3]; }
  else if (es && MESES[es[2]]) { d = +es[1]; m = MESES[es[2]]; y = es[3] ? +es[3] : undefined; }
  else if (en && MESES[en[1]]) { d = +en[2]; m = MESES[en[1]]; y = en[3] ? +en[3] : undefined; }
  if (!d || !m || d > 31 || m > 12) return undefined;
  if (!y) { const h = hoy.slice(0, 10); y = +h.slice(0, 4); if (iso(y, m, d) < h) y++; }
  return iso(y, m, d);
}

// REQ-1579: «de 1,000 a 1,080 USD» / «from 1,000 to 1,080 USD» / «ahora cuesta 1,080 USD».
export function leerCambio(texto: string, hoy: string): CambioLeido {
  const n = String.raw`(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;
  const par = texto.match(new RegExp(String.raw`(?:de|from)\s+${MONEDA.source}?\s*${n}\s*${MONEDA.source}?\s+(?:a|to)\s+${MONEDA.source}?\s*${n}\s*${MONEDA.source}?`, "i"));
  const r: CambioLeido = {};
  if (par) {
    r.netoAntes = num(par[2]); r.netoNuevo = num(par[5]);
    r.moneda = monedaDe(par[1] || par[3] || par[4] || par[6]);
  } else {
    const uno = texto.match(new RegExp(String.raw`(?:ahora|nueva tarifa|nuevo precio|now|new rate|new price)[^\d]{0,30}?${MONEDA.source}?\s*${n}\s*${MONEDA.source}?`, "i"));
    if (uno) { r.netoNuevo = num(uno[2]); r.moneda = monedaDe(uno[1] || uno[3]); }
  }
  const desde = leerFecha(texto, hoy);
  if (desde) r.desde = desde;
  return r;
}

// REQ-1579, REQ-1582
export function estadoInicial(c: CambioLeido): EstadoAviso {
  if (!c.netoNuevo || !Number.isFinite(c.netoNuevo) || c.netoNuevo <= 0) return "falta_monto";
  if (!c.desde) return "falta_fecha";
  return "por_confirmar";
}

// REQ-1579: el renglón del anexo al que se refiere el aviso (solo si hay uno claro).
export interface RenglonAnexo { id: string; producto: string; neto: number; moneda: Moneda; kind: MarkupKind; tripId: string | null; optionId: string | null }
const limpio = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export function renglonDelAviso(texto: string, anexo: RenglonAnexo[]): RenglonAnexo | null {
  const t = limpio(texto);
  const hits = anexo.filter((r) => r.producto.trim() && t.includes(limpio(r.producto)));
  return hits.length === 1 ? hits[0] : null;
}

// REQ-1579, REQ-1581: precio nuevo en la página con el markup existente; si el neto baja, baja (programa: nunca bajo el publicado del operador).
export function precioNuevo(neto: number, kind: MarkupKind, rates: MarkupRates, publicado?: number | null): number {
  return sellPrice(neto, { kind, published: publicado ?? null }, rates);
}

// REQ-1579: el comando solo corre sobre un aviso completo y aún no confirmado.
export function puedeConfirmar(a: { estado: EstadoAviso; netoNuevo?: number | null; desde?: string | null; renglonId?: string | null }): { ok: true } | { ok: false; motivo: string } {
  if (a.estado !== "por_confirmar") return { ok: false, motivo: `el aviso está «${a.estado}»` };
  if (!a.netoNuevo || !a.desde) return { ok: false, motivo: "faltan monto o fecha de vigencia" };
  if (!a.renglonId) return { ok: false, motivo: "falta elegir a qué producto del anexo corresponde" };
  return { ok: true };
}

// REQ-1579: ¿ya rige? (el precio en la página cambia ese día, no antes).
export const yaRige = (desde: string, hoy: string) => desde <= hoy.slice(0, 10);

const fmt = (n: number, m?: Moneda) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}${m ? ` ${m}` : ""}`;

// REQ-1579: aviso al PO (WhatsApp, sin saltos de línea dobles; panel con el mismo texto).
export function textoAvisoPO(a: { codigo: string; proveedor: string; producto: string; netoAntes?: number | null; netoNuevo: number; moneda?: Moneda; desde: string; precioAntes?: number | null; precioNuevo?: number | null }): string {
  const neto = a.netoAntes ? `de ${fmt(a.netoAntes, a.moneda)} a ${fmt(a.netoNuevo, a.moneda)}` : `a ${fmt(a.netoNuevo, a.moneda)}`;
  const pagina = a.precioNuevo != null ? ` En la página: ${a.precioAntes != null ? `de ${fmt(a.precioAntes)} a ` : ""}${fmt(a.precioNuevo)}.` : "";
  return `${a.proveedor} avisa cambio de tarifa (${a.codigo}): ${a.producto} ${neto} a partir del ${a.desde}.${pagina} Para aceptarlo: botón Confirmar en /admin/tarifas o responde «confirmo ${a.codigo}».`;
}

// REQ-1582: pide la fecha en el mismo hilo (la firma la pone armarCorreo).
export function correoPideFecha(idioma: "es" | "en", contacto?: string): string {
  return idioma === "en"
    ? `Hello${contacto ? ` ${contacto}` : ""},\n\nThank you for letting us know about the rate change. Could you confirm the date from which the new rate applies? With that date we will update our rate annex.\n\nKind regards,`
    : `Hola${contacto ? `, ${contacto}` : ""}:\n\nGracias por avisarnos del cambio de tarifa. ¿Nos confirman a partir de qué fecha aplica la nueva tarifa? Con esa fecha actualizamos el anexo de tarifas.\n\nSaludos,`;
}

// REQ-1579 (cl. 8.2): la confirmación «quedamos enterados» que actualiza el anexo.
export function correoEnterados(idioma: "es" | "en", a: { contacto?: string; producto: string; netoNuevo: number; moneda?: Moneda; desde: string }): string {
  return idioma === "en"
    ? `Hello${a.contacto ? ` ${a.contacto}` : ""},\n\nWe acknowledge the new rate for ${a.producto}: ${fmt(a.netoNuevo, a.moneda)} from ${a.desde}. Our rate annex has been updated accordingly, as set out in our agreement.\n\nKind regards,`
    : `Hola${a.contacto ? `, ${a.contacto}` : ""}:\n\nQuedamos enterados de la nueva tarifa de ${a.producto}: ${fmt(a.netoNuevo, a.moneda)} a partir del ${a.desde}. Con esta confirmación actualizamos el anexo de tarifas, como prevé nuestro acuerdo.\n\nSaludos,`;
}

// REQ-1579: código corto para el comando por WhatsApp.
export const codigoAviso = (n: number) => `T-${n}`;
export const leerComandoConfirmo = (texto: string): string | null => texto.trim().match(/^confirmo\s+(T-\d+)$/i)?.[1].toUpperCase() ?? null;
