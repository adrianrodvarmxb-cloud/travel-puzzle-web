// Catálogo de Travel Puzzle para el agente de WhatsApp (ZoeFel IA). Funciones puras: sin D1, fetch ni Next.
// Gates firmados por el PO (5 nov 2026): G1 A (FREETOUR apagado y bloqueado hasta autorización escrita, regla B3
// de docs/freetour), G2 C (busca cuando el mensaje trae destino/fecha/tipo; revisa en vivo antes de dar la liga) y
// G3 C (liga a la ficha con fecha y personas ya puestas; se reserva y paga en el sitio).

import { tourPath } from "@/destinations/lib/routes";

/** REQ-148: proveedor bloqueado. Un bot no vende tours de FREETOUR sin su autorización escrita (B3). */
export const FREETOUR = "freetour";
const MOTIVO_FREETOUR = "Bloqueado: FREETOUR no permite que un bot venda sus tours sin autorización escrita (pregunta 8 de docs/freetour/autorizaciones.md).";

export interface ViajeAgente {
  slug: string; path: string; title: string; summary: string; places: string; cities: string[]; kind: string;
  agencyId: string | null; price: string | null; durationDays: number | null; dates: string[];
  /** REQ-10849: id del proveedor de un tour con adaptador (`tangol`); los viajes no lo traen (propios o agencia). */
  proveedor?: string;
}
export interface Proveedor { id: string; nombre: string; bloqueado: boolean; motivo?: string }

// REQ-148, REQ-10849
export const proveedorDe = (v: Pick<ViajeAgente, "agencyId" | "proveedor">): string => v.proveedor ?? (v.agencyId ? `agencia:${v.agencyId}` : "propios");

/** REQ-10849: fila ligera del índice de tours (una consulta SQL, sin neto: `priceValue` es la tarifa pública, REQ-1543). */
export interface TourIndiceRow {
  id: string; slug: string | null; providerId: string; title: string; brief: string | null;
  priceValue: number; priceCurrency: string; durationMinutes: number | null; departureDates: unknown;
  citySlug: string | null; cityTranslations: unknown; countryIso2: string | null; countryTranslations: unknown;
}

const etiqueta = (translations: unknown, lang: string): string | null => {
  const t = (typeof translations === "string" ? (() => { try { return JSON.parse(translations); } catch { return {}; } })() : translations ?? {}) as Record<string, string | undefined>;
  return t[lang] ?? t.es ?? t.en ?? null;
};
const sinHtml = (html: string | null | undefined): string => (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const fechas = (raw: unknown): string[] => {
  const arr = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
  return Array.isArray(arr) ? arr.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)).map((d) => d.slice(0, 10)) : [];
};
const precioPublico = (amount: number, currency: string, lang: string): string | null => {
  if (!(amount > 0)) return null;
  const n = new Intl.NumberFormat(lang === "en" ? "en-US" : "es-MX", { maximumFractionDigits: 2 }).format(amount);
  return lang === "en" ? `${currency} ${n} per person` : `${currency} ${n} por persona`;
};

/**
 * REQ-10849 (decisión 40): un tour del índice entra a `buscarViajes` como un `ViajeAgente` más, con la ruta pública de
 * su ficha (`/destinos/<iso2>/<ciudad>/<slug>`) y su proveedor; FREETOUR nunca (decisión 42). Sin slug, ciudad o país → null.
 */
export function aTourAgente(r: TourIndiceRow, lang: string): ViajeAgente | null {
  const providerId = (r.providerId ?? "").trim().toLowerCase();
  const iso2 = (r.countryIso2 ?? "").trim().toLowerCase();
  if (!providerId || providerId === FREETOUR || !r.slug || !r.citySlug || !iso2) return null;
  let path: string;
  try { path = tourPath(iso2, r.citySlug, r.slug); } catch { return null; }
  const city = etiqueta(r.cityTranslations, lang);
  const country = etiqueta(r.countryTranslations, lang);
  return {
    slug: r.slug, path, title: sinHtml(r.title), summary: sinHtml(r.brief),
    places: country ?? "", cities: city ? [city] : [], kind: "tour", agencyId: null, proveedor: providerId,
    price: precioPublico(Number(r.priceValue), r.priceCurrency, lang),
    durationDays: r.durationMinutes ? Math.max(1, Math.ceil(r.durationMinutes / 1440)) : null,
    dates: fechas(r.departureDates),
  };
}

/** REQ-10845 (decisión 40): proveedor de tours con adaptador en el modelo común; sale solo si el sitio lo tiene encendido. */
export const TANGOL_PROVEEDOR: Proveedor = { id: "tangol", nombre: "Tangol (tours y excursiones en Sudamérica)", bloqueado: false };

// REQ-148, REQ-10845
export function listaProveedores(agencias: { id: string; name: string }[], tours: { tangol?: boolean } = {}): Proveedor[] {
  return [
    { id: "propios", nombre: "Viajes propios de Travel Puzzle", bloqueado: false },
    ...agencias.map((a) => ({ id: `agencia:${a.id}`, nombre: a.name, bloqueado: false })),
    ...(tours.tangol ? [TANGOL_PROVEEDOR] : []),
    { id: FREETOUR, nombre: "FREETOUR.com", bloqueado: true, motivo: MOTIVO_FREETOUR },
  ];
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const VACIAS = new Set("a al algo alguna alguno con de del el en es hay hola la las lo los me mi para por que quiero quisiera tienen tour tours un una unos viaje viajes y ir buenas buenos dias tardes noches gracias info informacion".split(" "));
const palabras = (s: string) => norm(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));

// REQ-149: los 5 viajes que mejor coinciden, solo de proveedores encendidos y nunca de FREETOUR.
export function buscarViajes(viajes: ViajeAgente[], { q, proveedores, limite = 5 }: { q: string; proveedores: string[]; limite?: number }): ViajeAgente[] {
  const permitidos = new Set(proveedores.filter((p) => p !== FREETOUR));
  const terms = palabras(q);
  if (!terms.length || !permitidos.size) return [];
  const puntua = (v: ViajeAgente) => {
    const fuerte = norm([v.title, v.places, ...v.cities].join(" "));
    const debil = norm(v.summary);
    return terms.reduce((s, t) => s + (fuerte.includes(t) ? 3 : debil.includes(t) ? 1 : 0), 0);
  };
  return viajes
    .filter((v) => permitidos.has(proveedorDe(v)))
    .map((v) => ({ v, s: puntua(v) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(1, Math.min(limite, 5)))
    .map((x) => x.v);
}

export interface Prellenado { fecha?: string; adultos?: number; ninos?: number }
const fechaValida = (f: unknown): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(`${f}T00:00:00Z`)) && new Date(`${f}T00:00:00Z`).toISOString().slice(0, 10) === f;
const entero = (x: unknown, min: number, max: number) => { const n = Number(x); return Number.isInteger(n) && n >= min && n <= max ? n : undefined; };

// REQ-150: liga a la ficha con fecha y personas; el ancla #solicitar abre el formulario.
export function enlacePrellenado(base: string, path: string, p: Prellenado): string {
  const qs = new URLSearchParams();
  if (fechaValida(p.fecha)) qs.set("fecha", p.fecha);
  const a = entero(p.adultos, 1, 20), n = entero(p.ninos, 0, 20);
  if (a !== undefined) qs.set("adultos", String(a));
  if (n !== undefined) qs.set("ninos", String(n));
  const s = qs.toString();
  return `${base.replace(/\/+$/, "")}${path}${s ? `?${s}` : ""}#solicitar`;
}

// REQ-150: la ficha solo acepta valores válidos (lo demás se ignora).
export function leerPrellenado(q: Record<string, string | string[] | undefined>): Prellenado {
  const uno = (k: string) => (Array.isArray(q[k]) ? q[k]![0] : q[k]);
  const out: Prellenado = {};
  const f = uno("fecha"); if (fechaValida(f)) out.fecha = f;
  const a = entero(uno("adultos"), 1, 20); if (a !== undefined) out.adultos = a;
  const n = entero(uno("ninos"), 0, 20); if (n !== undefined && (out.fecha || out.adultos)) out.ninos = n;
  return out;
}

// REQ-151: antes de dar la liga, la fecha se revisa contra las salidas vigentes.
export function revisarFecha(v: Pick<ViajeAgente, "dates">, fecha: string): { disponible: boolean; alternativas: string[]; aSolicitud?: true } {
  if (!v.dates.length) return { disponible: true, alternativas: [], aSolicitud: true };
  if (v.dates.includes(fecha)) return { disponible: true, alternativas: [] };
  return { disponible: false, alternativas: v.dates.slice(0, 3) };
}

// REQ-152: la llave es un secreto de al menos 24 caracteres; comparación de tiempo constante.
export function autorizado(header: string | null | undefined, secreto: string | undefined): boolean {
  if (!secreto || secreto.length < 24 || !header?.startsWith("Bearer ")) return false;
  const dado = header.slice(7);
  if (dado.length !== secreto.length) return false;
  let d = 0;
  for (let i = 0; i < dado.length; i++) d |= dado.charCodeAt(i) ^ secreto.charCodeAt(i);
  return d === 0;
}
