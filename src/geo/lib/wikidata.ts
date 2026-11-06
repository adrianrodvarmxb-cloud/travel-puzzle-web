/**
 * Wikidata como segunda opinión del cruce v2 (REQ-137). Puro: arma la consulta y lee la respuesta; el script
 * hace el fetch. Nunca decide sola: solo marca si coincide con el candidato propuesto. Sin Nominatim.
 */

/** Genérico de la marca, sin correos personales ni de otras marcas (política de User-Agent de Wikimedia). */
export const WIKIDATA_USER_AGENT = "TravelPuzzleBot/1.0 (+https://travelpuzzle.com.mx)";
export const WDQS_URL = "https://query.wikidata.org/sparql";
export const WIKIDATA_BATCH = 15;

export interface WdItem {
  qid: string;
  geonameid: number | null;
  lat: number | null;
  lng: number | null;
}

const lit = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** REQ-137: SPARQL por etiqueta (es y en) + país (P17 con ISO-2 P297); devuelve P1566 (geonameid) y P625 (coordenada). */
export function buildWikidataQuery(rows: ReadonlyArray<{ cityId: number; iso2: string; labels: readonly string[] }>): string {
  const values = rows.flatMap((r) =>
    [...new Set(r.labels.filter(Boolean))].flatMap((l) => ["es", "en"].map((lang) => `(${lit(String(r.cityId))} ${lit(l)}@${lang} ${lit(r.iso2)})`)),
  );
  return [
    "SELECT ?cid ?item ?gn ?coord WHERE {",
    `  VALUES (?cid ?label ?iso) { ${values.join(" ")} }`,
    // Orden fijo: primero la etiqueta (indexada), luego el país; si no, WDQS recorre todo el país y se agota.
    "  hint:Query hint:optimizer \"None\" .",
    "  ?item rdfs:label ?label .",
    "  ?item wdt:P17 ?country .",
    "  ?country wdt:P297 ?iso .",
    "  OPTIONAL { ?item wdt:P1566 ?gn . }",
    "  OPTIONAL { ?item wdt:P625 ?coord . }",
    "}",
  ].join("\n");
}

interface Binding { [k: string]: { value: string } | undefined }

/** REQ-137: respuesta JSON de WDQS → items por ciudad (sin repetir QID). */
export function parseWikidataResponse(json: unknown): Map<number, WdItem[]> {
  const out = new Map<number, WdItem[]>();
  const bindings = ((json as { results?: { bindings?: Binding[] } })?.results?.bindings ?? []) as Binding[];
  for (const b of bindings) {
    const cid = Number(b.cid?.value);
    const qid = b.item?.value.split("/").pop();
    if (!Number.isInteger(cid) || !qid) continue;
    const list = out.get(cid) ?? [];
    let item = list.find((i) => i.qid === qid);
    if (!item) {
      item = { qid, geonameid: null, lat: null, lng: null };
      list.push(item);
      out.set(cid, list);
    }
    const gn = Number(b.gn?.value);
    if (!item.geonameid && Number.isInteger(gn) && gn > 0) item.geonameid = gn;
    const m = b.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (m && item.lat === null) {
      item.lng = Number(m[1]);
      item.lat = Number(m[2]);
    }
  }
  return out;
}

export type WdOpinion = "coincide" | "difiere" | "varios" | "sin-dato";

/** REQ-137: compara Wikidata con el geonameid propuesto. Con varios items, va a revisión («varios»). */
export function wikidataOpinion(items: readonly WdItem[] | undefined, proposed: number | null): { opinion: WdOpinion; qid: string | null; geonameid: number | null } {
  const withGn = (items ?? []).filter((i) => i.geonameid);
  if (!withGn.length) return { opinion: "sin-dato", qid: null, geonameid: null };
  if (withGn.length > 1) {
    const hit = withGn.find((i) => i.geonameid === proposed);
    return { opinion: "varios", qid: hit?.qid ?? null, geonameid: hit?.geonameid ?? null };
  }
  const [i] = withGn;
  return { opinion: i.geonameid === proposed ? "coincide" : "difiere", qid: i.qid, geonameid: i.geonameid };
}
