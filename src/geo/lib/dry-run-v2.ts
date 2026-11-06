/**
 * Ensayo del cruce v2 de identidad geográfica (informe «Identidad geográfica del catálogo», pasos 2–5). Puro:
 * recibe lo exportado de D1 (solo lectura), el índice de GeoNames y los overrides; devuelve filas, resumen y SQL.
 * Nada se escribe en la base desde aquí.
 */
import { parseCoordinates } from "../../destinations/lib/geonames";
import { cityName } from "../../destinations/lib/dry-run";
import { resolveCityAlias, suggestAliases, type CityAlias } from "./alias";
import { assessCentroids, type Point } from "./centroid";
import { mapCityCountry, mapCountry, type AnCity, type CountryOverride } from "./country";
import { findCandidates, nearestInCountryKm, type GeoIndexV2 } from "./geonames-v2";
import { resolveCity, type CityOverride, type ResolvedStatus, type Resolution } from "./resolve";
import { decideMatch, type ScoredCandidate } from "./score";
import { wikidataOpinion, type WdItem, type WdOpinion } from "./wikidata";

export interface GeoV2Input {
  countries: ReadonlyArray<{ id: number; code: string }>;
  cities: ReadonlyArray<{ id: number; countryId: number; translations: unknown; geonameid?: number | null }>;
  tours: ReadonlyArray<{ cityId: number; coords?: string | null }>;
  index: GeoIndexV2;
  overrides: { countries: readonly CountryOverride[]; an: readonly AnCity[]; aliases: readonly CityAlias[]; cities: ReadonlyMap<string, CityOverride> };
  wikidata?: ReadonlyMap<number, WdItem[]>;
  /** Estado del cruce v1 por ciudad (para «antes»); opcional. */
  baseline?: ReadonlyMap<number, string>;
  provider?: string;
}

export interface GeoV2Row {
  cityId: number;
  rawCountry: string;
  countryCode: string | null;
  regionCode: string | null;
  countrySource: string;
  name: string;
  names: string[];
  cityKey: string | null;
  canonicalCityId: number | null;
  points: number;
  centroid: Point | null;
  centroidReliable: boolean;
  centroidReasons: string[];
  status: ResolvedStatus;
  geonameid: number | null;
  proposed: number | null;
  source: Resolution["source"];
  reason: string;
  storedGeonameid: number | null;
  controlDiff: boolean;
  approxStatus: string;
  approxReason: string;
  top: ScoredCandidate[];
  wikidata: { opinion: WdOpinion; qid: string | null; geonameid: number | null };
  v1Status: string | null;
}

function translationsOf(v: unknown): string[] {
  let t: unknown = v;
  if (typeof v === "string") {
    try {
      t = JSON.parse(v);
    } catch {
      t = null;
    }
  }
  return t && typeof t === "object" ? Object.values(t as Record<string, unknown>).filter((s): s is string => typeof s === "string" && !!s.trim()) : [];
}

const count = <T>(xs: readonly T[], f: (x: T) => boolean) => xs.filter(f).length;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

/** REQ-131…137: plan completo del ensayo v2. */
export function planGeoV2(input: GeoV2Input) {
  const provider = input.provider ?? "freetour";
  const countryById = new Map(input.countries.map((c) => [c.id, c]));
  const mapped = new Map(input.countries.map((c) => [c.id, mapCountry(c, input.overrides.countries, provider)]));

  const points = new Map<number, Point[]>();
  for (const t of input.tours) {
    const p = parseCoordinates(t.coords);
    if (p) points.set(t.cityId, [...(points.get(t.cityId) ?? []), p]);
  }

  // Unidades de cruce: la ciudad canónica junta nombres y puntos de sus alias (REQ-135).
  const unitOf = new Map<number, number>();
  for (const c of input.cities) unitOf.set(c.id, resolveCityAlias(provider, c.id, input.overrides.aliases)?.canonicalCityId ?? c.id);
  const units = new Map<number, { names: Set<string>; points: Point[]; members: number[] }>();
  for (const c of input.cities) {
    const u = unitOf.get(c.id)!;
    const unit = units.get(u) ?? { names: new Set<string>(), points: [], members: [] };
    for (const n of [cityName(c.translations), ...translationsOf(c.translations)]) if (n) unit.names.add(n);
    unit.points.push(...(points.get(c.id) ?? []));
    unit.members.push(c.id);
    units.set(u, unit);
  }

  const cityCountry = new Map(
    input.cities.map((c) => {
      const base = mapped.get(c.countryId) ?? { countryCode: null, regionCode: null, indexable: false, perCity: false, source: "pendiente" as const };
      return [c.id, mapCityCountry(c.id, base, input.overrides.an, provider)];
    }),
  );
  const isoOfUnit = (u: number) => cityCountry.get(u)?.countryCode ?? cityCountry.get(units.get(u)!.members[0])?.countryCode ?? null;

  const assessment = assessCentroids(
    [...units].map(([id, u]) => ({ id, points: u.points })),
    (id, at) => {
      const iso = isoOfUnit(id);
      return iso ? nearestInCountryKm(input.index, iso, at) : 0;
    },
  );

  const decisions = new Map(
    [...units].map(([id, u]) => {
      const iso = isoOfUnit(id);
      const a = assessment.get(id)!;
      if (!iso) return [id, null] as const;
      const candidates = findCandidates(input.index, { iso2: iso, names: [...u.names], centroid: a.centroid });
      return [id, decideMatch({ candidates, reliable: a.reliable })] as const;
    }),
  );

  const rows: GeoV2Row[] = input.cities.map((c) => {
    const u = unitOf.get(c.id)!;
    const unit = units.get(u)!;
    const alias = resolveCityAlias(provider, c.id, input.overrides.aliases);
    const country = cityCountry.get(c.id)!;
    const a = assessment.get(u)!;
    const d = decisions.get(u) ?? null;
    const raw = countryById.get(c.countryId)?.code ?? "";
    const base = {
      cityId: c.id,
      rawCountry: raw,
      countryCode: country.countryCode,
      regionCode: country.regionCode,
      countrySource: country.source,
      name: cityName(c.translations),
      names: [...unit.names],
      cityKey: alias?.cityKey ?? null,
      canonicalCityId: alias?.canonicalCityId ?? null,
      points: points.get(c.id)?.length ?? 0,
      centroid: a.centroid,
      centroidReliable: a.reliable,
      centroidReasons: a.reasons,
      storedGeonameid: c.geonameid ?? null,
      v1Status: input.baseline?.get(c.id) ?? null,
    };
    if (!country.indexable && country.source !== "pendiente" && !("reason" in country && country.reason)) {
      return { ...base, status: "sin-pagina", geonameid: null, proposed: null, source: "override", reason: `país ${raw} sin página`, controlDiff: false, approxStatus: "sin-pagina", approxReason: "sin página", top: [], wikidata: { opinion: "sin-dato", qid: null, geonameid: null } };
    }
    if (!d) {
      const reason = ("reason" in country && country.reason) || (country.source === "conflicto" ? `override de país no coincide con el código ${raw}` : `país ${raw} sin ISO-2`);
      return { ...base, status: "revisar", geonameid: null, proposed: null, source: "aproximado", reason, controlDiff: false, approxStatus: "revisar", approxReason: reason, top: [], wikidata: { opinion: "sin-dato", qid: null, geonameid: null } };
    }
    const r = resolveCity({ provider, cityId: c.id, storedGeonameid: c.geonameid, approx: d }, input.overrides.cities);
    return {
      ...base,
      status: r.status,
      geonameid: r.geonameid,
      proposed: d.geonameid,
      source: r.source,
      reason: r.reason,
      controlDiff: r.controlDiff,
      approxStatus: d.status,
      approxReason: d.reason,
      top: d.top,
      wikidata: wikidataOpinion(input.wikidata?.get(c.id), d.geonameid),
    };
  });

  const matchable = rows.filter((r) => r.status !== "sin-pagina");
  const stored = rows.filter((r) => r.storedGeonameid);
  const summary = {
    ciudades: rows.length,
    sinPagina: count(rows, (r) => r.status === "sin-pagina"),
    antes: input.baseline
      ? { auto: count(rows, (r) => r.v1Status === "auto"), revisar: count(rows, (r) => r.v1Status === "revisar"), sinCandidato: count(rows, (r) => r.v1Status === "sin-candidato") }
      : null,
    // Solo la regla v2 (sin contar los geonameid guardados ni overrides): mide la receta.
    reglaV2: {
      auto: count(matchable, (r) => r.approxStatus === "auto"),
      revisar: count(matchable, (r) => r.approxStatus === "revisar"),
      sinCandidato: count(matchable, (r) => r.approxStatus === "sin-candidato"),
      pctAuto: pct(count(matchable, (r) => r.approxStatus === "auto"), rows.length),
    },
    // Resultado final con prioridad override > id > aproximado.
    despues: {
      auto: count(rows, (r) => r.status === "auto"),
      revisar: count(rows, (r) => r.status === "revisar"),
      sinCandidato: count(rows, (r) => r.status === "sin-candidato"),
      pctAuto: pct(count(rows, (r) => r.status === "auto"), rows.length),
      nuevasPorLlenar: count(rows, (r) => r.status === "auto" && !!r.geonameid && !r.storedGeonameid),
    },
    control: {
      conGeonameid: stored.length,
      coinciden: count(stored, (r) => r.proposed === r.storedGeonameid),
      difieren: count(stored, (r) => r.controlDiff),
      v2NoAuto: count(stored, (r) => r.approxStatus !== "auto"),
    },
    centroideNoConfiable: count(rows, (r) => !!r.centroid && !r.centroidReliable),
    sinCentroide: count(rows, (r) => !r.centroid),
    porRegla: Object.fromEntries(
      Object.entries(
        rows.reduce<Record<string, number>>((acc, r) => {
          const k = `${r.approxStatus}: ${r.approxReason.replace(/[\d.]+ km/g, "N km").replace(/\d+/g, "N")}`;
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    ),
    paisesEspeciales: rows.filter((r) => r.countrySource === "override").map((r) => `${r.cityId} ${r.rawCountry}→${r.countryCode ?? "—"}${r.regionCode ? ` ${r.regionCode}` : ""}`),
    alias: rows.filter((r) => r.cityKey).map((r) => `${r.cityId}→${r.cityKey}(${r.canonicalCityId})`),
    wikidata: {
      consultadas: input.wikidata ? input.wikidata.size : 0,
      coincide: count(rows, (r) => r.wikidata.opinion === "coincide"),
      difiere: count(rows, (r) => r.wikidata.opinion === "difiere"),
      varios: count(rows, (r) => r.wikidata.opinion === "varios"),
      revisarConWikidataDeAcuerdo: count(rows, (r) => r.status === "revisar" && r.wikidata.opinion === "coincide"),
    },
  };

  const aliasSuggestions = suggestAliases(
    [...units].map(([id, u]) => ({ id, iso2: isoOfUnit(id), names: [...u.names], centroid: assessment.get(id)!.centroid })),
  );

  return { rows, summary, aliasSuggestions };
}

export type GeoV2Plan = ReturnType<typeof planGeoV2>;

/** REQ-137: SQL idempotente que hoy se puede correr (columnas de la 0015): solo llena geonameid vacíos. */
export function buildGeoV2Sql(plan: GeoV2Plan): string {
  const lines = ["-- Cruce v2 (ensayo). Solo llena City.geonameid vacíos; un geonameid guardado nunca se toca. Aplicar = candado del PO."];
  for (const r of plan.rows) {
    if (r.status !== "auto" || !r.geonameid || r.storedGeonameid) continue;
    lines.push(`UPDATE "City" SET "geonameid" = ${r.geonameid} WHERE "id" = ${r.cityId} AND "geonameid" IS NULL;`);
  }
  for (const r of plan.rows)
    if (r.source === "override" && r.geonameid && r.storedGeonameid && r.geonameid !== r.storedGeonameid)
      lines.push(`-- REVISAR: override ${r.geonameid} difiere del guardado ${r.storedGeonameid} en la ciudad ${r.cityId} (no se aplica solo)`);
  return lines.join("\n") + "\n";
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** REQ-134/135: SQL que necesita la migración 0016 (región, país por ciudad, alias). Idempotente; no se aplica sin la 0016. */
export function buildGeoV2PendingSql(plan: GeoV2Plan, provider = "freetour"): string {
  const lines = ["-- Requiere migrations/0016_identidad_geo.sql aplicada (candado del PO). Idempotente: solo llena lo vacío."];
  for (const r of plan.rows) {
    if (r.regionCode) lines.push(`UPDATE "City" SET "regionCode" = ${q(r.regionCode)} WHERE "id" = ${r.cityId} AND "regionCode" IS NULL;`);
    if (r.countrySource === "override" && r.countryCode) lines.push(`UPDATE "City" SET "countryCode" = ${q(r.countryCode)} WHERE "id" = ${r.cityId} AND "countryCode" IS NULL;`);
  }
  for (const r of plan.rows)
    if (r.canonicalCityId) lines.push(`INSERT OR IGNORE INTO "CityAlias" ("provider", "providerCityId", "cityId") VALUES (${q(provider)}, ${r.cityId}, ${r.canonicalCityId});`);
  return lines.join("\n") + "\n";
}

/** REQ-137: filas del CSV de revisión con top-3 candidatos (geonameid, nombre, estado, km, población, puntaje). */
export function reviewCsvRows(rows: readonly GeoV2Row[]): Record<string, string | number>[] {
  return rows.map((r) => {
    const out: Record<string, string | number> = {
      cityId: r.cityId,
      pais_crudo: r.rawCountry,
      pais: r.countryCode ?? "",
      region: r.regionCode ?? "",
      nombre: r.name,
      otros_nombres: r.names.filter((n) => n !== r.name).join(" | "),
      alias: r.cityKey ?? "",
      tours_con_punto: r.points,
      centroide: r.centroid ? `${r.centroid.lat.toFixed(5)},${r.centroid.lng.toFixed(5)}` : "",
      centroide_confiable: r.centroid ? (r.centroidReliable ? "si" : "no") : "",
      motivo_centroide: r.centroidReasons.join("; "),
      status: r.status,
      motivo: r.reason,
      propuesto: r.proposed ?? "",
      ya_tiene: r.storedGeonameid ?? "",
      v1: r.v1Status ?? "",
    };
    for (let i = 0; i < 3; i++) {
      const c = r.top[i];
      out[`c${i + 1}_geonameid`] = c?.geonameid ?? "";
      out[`c${i + 1}_nombre`] = c?.name ?? "";
      out[`c${i + 1}_admin1`] = c?.admin1 ?? "";
      out[`c${i + 1}_tipo`] = c?.match ?? "";
      out[`c${i + 1}_km`] = c?.distanceKm ?? "";
      out[`c${i + 1}_poblacion`] = c?.population ?? "";
      out[`c${i + 1}_puntaje`] = c?.score ?? "";
    }
    out.wikidata = r.wikidata.opinion;
    out.wikidata_qid = r.wikidata.qid ?? "";
    out.wikidata_geonameid = r.wikidata.geonameid ?? "";
    return out;
  });
}
