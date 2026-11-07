/**
 * REQ-580: contrato de una ficha servida (tour o viaje, de cualquier proveedor). Puro: recibe el HTML crudo del
 * servidor (sin JS) y devuelve la lista de fallas. Lo usan el test de contrato (cada tipo de ficha) y la prueba de
 * humo (fichas reales descubiertas). Un proveedor nuevo que no cumpla falla aquí antes de publicarse.
 *
 * Exige: un H1; JSON-LD que parsea con un solo nodo Product+TouristTrip cuyo `name` es el H1; Offer con moneda
 * ISO 4217 (y la esperada si se indica); sin aggregateRating ni review salvo reseñas propias; precio, duración y
 * operador del marcado visibles en el texto; y, con el interruptor apagado, sin «En breve», descripción ni keywords.
 */

export interface ContractOptions {
  /** Valor de `indexableEnrichment` del proveedor de la ficha. */
  enrichment: boolean;
  /** Moneda que debe llevar la Offer (la del dato). */
  currency?: string;
  /** Solo si la ficha marca reseñas recogidas en Travel Puzzle. */
  ownReviews?: boolean;
  /** El test exige duración y operador; la prueba de humo los revisa solo si el marcado los trae. */
  requireDuration?: boolean;
  requireOperator?: boolean;
  /** Un viaje a la medida sin precio no lleva Offer (es lo honesto); el test la exige en lo que tiene precio. */
  requireOffer?: boolean;
}

type Node = Record<string, unknown>;
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});
const norm = (s: string) => decode(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Texto visible del HTML del servidor: sin scripts, estilos ni etiquetas. */
export function visibleText(html: string): string {
  return norm(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

export function jsonLdNodes(html: string): { nodes: Node[]; errors: string[] } {
  const nodes: Node[] = [];
  const errors: string[] = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(m[1]);
      for (const n of Array.isArray(v) ? v : v?.["@graph"] ?? [v]) if (n && typeof n === "object") nodes.push(n as Node);
    } catch (e) { errors.push(`JSON-LD que no parsea: ${(e as Error).message}`); }
  }
  return { nodes, errors };
}

const types = (n: Node) => (Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]]).map(String);
const hasDeep = (v: unknown, key: string): boolean =>
  !!v && typeof v === "object" && (Object.prototype.hasOwnProperty.call(v, key) || Object.values(v as object).some((x) => hasDeep(x, key)));
const priceRe = (n: number) => {
  const int = String(Math.floor(n));
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "[,. ]?");
  return new RegExp(`(^|[^0-9])${grouped}([^0-9]|$)`);
};

// REQ-580
export function fichaContractFailures(html: string, o: ContractOptions): string[] {
  const f: string[] = [];
  const text = visibleText(html);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => norm(m[1])).filter(Boolean);
  if (h1s.length !== 1) f.push(`se esperaba 1 H1 con texto y hay ${h1s.length}`);

  const { nodes, errors } = jsonLdNodes(html);
  f.push(...errors);
  const products = nodes.filter((n) => { const t = types(n); return t.includes("Product") && t.includes("TouristTrip"); });
  if (products.length !== 1) { f.push(`se esperaba 1 nodo ["Product","TouristTrip"] y hay ${products.length}`); return f; }
  const p = products[0];
  if (h1s[0] && norm(String(p.name ?? "")) !== h1s[0]) f.push(`el name del marcado («${p.name}») no es el H1`);

  if (!o.ownReviews && nodes.some((n) => hasDeep(n, "aggregateRating") || hasDeep(n, "review"))) f.push("JSON-LD con aggregateRating o review que no son reseñas propias (Gate 2)");

  const offer = p.offers as Node | undefined;
  if (!offer || typeof offer !== "object") { if (o.requireOffer) f.push("sin Offer"); }
  else {
    const cur = String(offer.priceCurrency ?? "");
    if (!/^[A-Z]{3}$/.test(cur)) f.push(`moneda inválida «${cur}»`);
    if (o.currency && cur !== o.currency.toUpperCase()) f.push(`moneda ${cur}, se esperaba ${o.currency.toUpperCase()}`);
    const price = Number(offer.price);
    if (!Number.isFinite(price) || price < 0) f.push(`precio inválido «${offer.price}»`);
    else if (price === 0 ? !/free tour|gratis|pieza libre|\bfree\b/.test(text) : !priceRe(price).test(text)) f.push(`el precio ${price} no se ve en la página`);
  }

  const props = Array.isArray(p.additionalProperty) ? (p.additionalProperty as Node[]) : [];
  const duration = props.find((x) => /^(duración|duration)$/i.test(String(x.name)));
  if (duration) { if (!text.includes(norm(String(duration.value)))) f.push(`la duración «${duration.value}» no se ve en la página`); }
  else if (o.requireDuration) f.push("sin duración en additionalProperty");

  const op = (p.provider as Node | undefined)?.name;
  if (op) { if (!text.includes(norm(String(op)))) f.push(`el operador «${op}» no se ve en la página`); }
  else if (o.requireOperator) f.push("sin operador (provider)");
  if (/freetour|free tour\.com/i.test(JSON.stringify(p.provider ?? "") + JSON.stringify(p.brand ?? ""))) f.push("el marcado nombra a FREETOUR como operador");

  if (!o.enrichment) {
    if (/data-seo="en-breve"/.test(html)) f.push("«En breve» en un proveedor sin enriquecimiento (REQ-570)");
    if (p.description || p.keywords) f.push("descripción o keywords en un proveedor sin enriquecimiento (REQ-570)");
  }
  return f;
}

/** Fichas que revisa la prueba de humo (las de producto, no los hubs). */
export function isFichaPath(path: string): boolean {
  return /^\/viajes\/[^/]+\/[^/?#]+$/.test(path) || /^\/destinos\/[^/]+\/[^/]+\/[^/?#]+$/.test(path);
}
