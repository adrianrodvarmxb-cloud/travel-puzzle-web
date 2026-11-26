/**
 * REQ-10881 · Ficha única, ola 12 (plan §2: `lib/addons.ts`; §8 bis «Adicionales por proveedor», REQ-10636, PO 14-11-2026
 * 05:57 y 06:01). Reglas del plan: «cada adicional sale con precio final y su moneda; sin precio confirmado no se
 * muestra; el neto nunca llega al navegador»; «cada temporada con su fecha ("si no está clara, no publicar")»; «vuelos
 * internos con su cláusula de deslinde»; «Tangol sí tiene, con transporte y sin transporte»: el traslado es su
 * adicional, sale de las opciones de la API (con y sin traslado) y se muestra con la diferencia de precio a la vista.
 * - Lo que entra ya es precio público (final, con el markup firmado): aquí no hay netos ni márgenes y `addonFromRecord`
 *   solo toma los campos conocidos, así que un registro con `net`/`markup`/`commission` los pierde antes de llegar al modelo.
 * - Sin precio, el adicional no sale (la salida «a cotizar con un asesor» del plan queda como gate del PO, G-A12-1).
 * - Sin `Intl` (INC-001): fechas en ISO tal cual. Puro: sin Firestore, sin `fetch`, sin DOM.
 */
import type { FichaAddon, FichaAddonKind, FichaLang, FichaOption, FichaPrice } from "./model";

export type { FichaAddon, FichaAddonKind } from "./model";
import { formatAmount, localPriceUrl } from "./local-price";

const KINDS: readonly FichaAddonKind[] = ["transfer", "single-room", "half-board", "full-board", "internal-flight", "extension", "extra-night", "optional", "date-surcharge", "other"];

const TRANSFER_NAME: Record<FichaLang, string> = {
  es: "Traslado desde tu hotel",
  en: "Hotel pickup",
  pt: "Traslado desde o seu hotel",
  fr: "Transfert depuis votre hôtel",
  de: "Abholung vom Hotel",
  it: "Trasferimento dal tuo hotel",
};

const lowest = (options: FichaOption[], withTransfer: boolean): FichaPrice | null => {
  const prices = options
    .filter((o) => o.transferIncluded === withTransfer && o.price && o.price.amount > 0)
    .map((o) => o.price as FichaPrice);
  if (!prices.length) return null;
  return prices.reduce((min, p) => (p.amount < min.amount ? p : min));
};

/**
 * Traslado de Tangol como adicional: la opción más baja con traslado contra la más baja sin traslado, en la misma
 * moneda y la misma base; el adicional vale la diferencia. Sin un lado, sin precio, con monedas o bases distintas o
 * sin diferencia positiva, null: nunca un precio inventado. Con las opciones de hoy (sin precio ni dato de traslado)
 * devuelve null, así que la ficha no cambia hasta que el sync guarde las opciones con su tarifa pública.
 */
// REQ-10881
export function transferAddonFromOptions(options: FichaOption[], lang: FichaLang): FichaAddon | null {
  const con = lowest(options, true);
  const sin = lowest(options, false);
  if (!con || !sin) return null;
  if (con.currency !== sin.currency || con.per !== sin.per) return null;
  const diff = Math.round((con.amount - sin.amount) * 100) / 100;
  if (diff <= 0) return null;
  return { id: "transfer", kind: "transfer", name: TRANSFER_NAME[lang] ?? TRANSFER_NAME.es, price: { amount: diff, currency: con.currency, per: con.per }, season: null, note: null };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const seasonOk = (s: FichaAddon["season"]): boolean => s === null || (ISO_DAY.test(s.from) && ISO_DAY.test(s.to) && s.from <= s.to);

/**
 * Los que se pueden mostrar: con precio positivo; temporada con sus dos fechas en orden y, si se da «hoy», que no haya
 * terminado; vuelo interno solo con su nota de deslinde; sin repetidos por id. El orden de entrada se respeta.
 */
// REQ-10881
export function visibleAddons(addons: readonly FichaAddon[], opts: { today?: string } = {}): FichaAddon[] {
  const seen = new Set<string>();
  const out: FichaAddon[] = [];
  for (const a of addons) {
    if (seen.has(a.id)) continue;
    if (!a.price || !(a.price.amount > 0)) continue;
    if (!seasonOk(a.season)) continue;
    if (a.season && opts.today && a.season.to < opts.today) continue;
    if (a.kind === "internal-flight" && !a.note?.trim()) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

const priceOf = (v: unknown): FichaPrice | null => {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  const per = p.per;
  if (typeof p.amount !== "number" || !Number.isFinite(p.amount) || typeof p.currency !== "string" || !p.currency.trim()) return null;
  if (per !== "person" && per !== "group" && per !== "total") return null;
  return { amount: p.amount, currency: p.currency.trim().toUpperCase(), per };
};

/**
 * Un adicional desde un registro externo (tabla, documento del Proyecto, JSON de un proveedor): solo pasan los campos
 * conocidos, con el precio ya público. Un tipo desconocido o sin id/nombre devuelve null; un precio mal formado cuenta
 * como «sin precio» (y entonces `visibleAddons` lo oculta). El neto, el markup y la comisión no tienen por dónde entrar.
 */
// REQ-10881
export function addonFromRecord(rec: unknown): FichaAddon | null {
  if (!rec || typeof rec !== "object") return null;
  const r = rec as Record<string, unknown>;
  const id = str(r.id);
  const name = str(r.name);
  const kind = typeof r.kind === "string" && (KINDS as readonly string[]).includes(r.kind) ? (r.kind as FichaAddonKind) : null;
  if (!id || !name || !kind) return null;
  const s = r.season;
  const season =
    s && typeof s === "object" && typeof (s as { from?: unknown }).from === "string" && typeof (s as { to?: unknown }).to === "string"
      ? { from: (s as { from: string }).from, to: (s as { to: string }).to }
      : null;
  return { id, kind, name, price: priceOf(r.price), season, note: str(r.note) };
}

export interface AddonCard {
  id: string;
  kind: FichaAddonKind;
  name: string;
  /** Precio en la moneda del proveedor, igual para todos (el HTML va en caché, REQ-3318). */
  priceLabel: string;
  /** REQ-10879: ruta para que el navegador pida el precio en la moneda del visitante; null = no se pide. */
  localUrl: string | null;
  seasonLabel: string | null;
  note: string | null;
}

interface AddonCopy { per: Record<FichaPrice["per"], string>; season: (from: string, to: string) => string }
const COPY: Record<FichaLang, AddonCopy> = {
  es: { per: { person: "por persona", group: "por grupo", total: "en total" }, season: (f, t) => `Del ${f} al ${t}` },
  en: { per: { person: "per person", group: "per group", total: "in total" }, season: (f, t) => `From ${f} to ${t}` },
  pt: { per: { person: "por pessoa", group: "por grupo", total: "no total" }, season: (f, t) => `De ${f} a ${t}` },
  fr: { per: { person: "par personne", group: "par groupe", total: "au total" }, season: (f, t) => `Du ${f} au ${t}` },
  de: { per: { person: "pro Person", group: "pro Gruppe", total: "insgesamt" }, season: (f, t) => `Vom ${f} bis ${t}` },
  it: { per: { person: "a persona", group: "per gruppo", total: "in totale" }, season: (f, t) => `Dal ${f} al ${t}` },
};

/** Tarjetas del bloque 12 para los adicionales: solo los visibles; precio del proveedor y, con la moneda local, su ruta. */
// REQ-10881
export function addonCards(addons: readonly FichaAddon[], lang: FichaLang, opts: { localCurrency: boolean; today?: string }): AddonCard[] {
  const c = COPY[lang] ?? COPY.es;
  return visibleAddons(addons, { today: opts.today }).map((a) => {
    const price = a.price as FichaPrice;
    return {
      id: a.id,
      kind: a.kind,
      name: a.name,
      priceLabel: `${formatAmount(price.amount, price.currency, lang)} ${c.per[price.per]}`,
      localUrl: opts.localCurrency ? localPriceUrl(price, lang) : null,
      seasonLabel: a.season ? c.season(a.season.from, a.season.to) : null,
      note: a.note,
    };
  });
}
