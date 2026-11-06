/**
 * Países que FREETOUR no da en ISO 3166-1 (REQ-134). Puro.
 * SCT/WLS/NIR → GB con región GB-SCT/GB-WLS/GB-NIR; AN (Antillas, extinto en 2010) → CW/SX/BQ por ciudad
 * con tabla manual; XX → sin país y sin página. La tabla vive en src/geo/data/country-overrides.csv (revisión por PR).
 */
import { iso2FromCountry } from "../../destinations/lib/ids";
import { parseCsv, toId } from "./csv";

export interface CountryOverride {
  provider: string;
  providerCountryId: number;
  rawCode: string;
  countryCode: string | null;
  regionCode: string | null;
  indexable: boolean;
  perCity: boolean;
}

export interface CountryMapping {
  countryCode: string | null;
  regionCode: string | null;
  indexable: boolean;
  /** true = el país se decide ciudad por ciudad (AN). */
  perCity: boolean;
  source: "override" | "iso" | "pendiente" | "conflicto";
}

const ISO2 = /^[A-Z]{2}$/;
const REGION = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;
const yes = (v: string | undefined) => /^(si|sí|true|1)$/i.test((v ?? "").trim());

/** REQ-134: lee country-overrides.csv; descarta filas con códigos mal formados. */
export function parseCountryOverrides(text: string): CountryOverride[] {
  return parseCsv(text).flatMap((r) => {
    const id = toId(r.provider_country_id);
    const cc = (r.country_code ?? "").toUpperCase() || null;
    const rc = (r.region_code ?? "").toUpperCase() || null;
    if (!id || !r.provider || (cc && !ISO2.test(cc)) || (rc && !REGION.test(rc))) return [];
    return [{ provider: r.provider, providerCountryId: id, rawCode: (r.codigo_crudo ?? "").toUpperCase(), countryCode: cc, regionCode: rc, indexable: yes(r.indexable), perCity: yes(r.por_ciudad) }];
  });
}

/** REQ-134: país de FREETOUR → ISO-2 + región. El override solo aplica si el código crudo coincide. */
export function mapCountry(c: { id: number; code: string }, overrides: readonly CountryOverride[], provider = "freetour"): CountryMapping {
  const o = overrides.find((x) => x.provider === provider && x.providerCountryId === c.id);
  const raw = (c.code ?? "").toUpperCase().replace(/-\d+$/, "");
  if (o) {
    if (o.rawCode && o.rawCode !== raw) return { countryCode: null, regionCode: null, indexable: false, perCity: false, source: "conflicto" };
    return { countryCode: o.countryCode, regionCode: o.regionCode, indexable: o.indexable, perCity: o.perCity, source: "override" };
  }
  const iso = iso2FromCountry({ code: c.code });
  if (!iso) return { countryCode: null, regionCode: null, indexable: false, perCity: false, source: "pendiente" };
  return { countryCode: iso, regionCode: null, indexable: true, perCity: false, source: "iso" };
}

export interface AnCity {
  provider: string;
  providerCityId: number | null;
  nombre: string;
  countryCode: string;
  estado: "aprobado" | "revisar";
}

/** REQ-134: lee an-cities.csv (AN → CW/SX/BQ/AW por ciudad). Solo «aprobado» con id se aplica. */
export function parseAnCities(text: string): AnCity[] {
  return parseCsv(text).flatMap((r) => {
    const cc = (r.country_code ?? "").toUpperCase();
    if (!["CW", "SX", "BQ", "AW"].includes(cc)) return [];
    return [{ provider: r.provider || "freetour", providerCityId: toId(r.provider_city_id), nombre: r.nombre ?? "", countryCode: cc, estado: r.estado === "aprobado" ? "aprobado" : "revisar" }];
  });
}

/** REQ-134: país final de una ciudad. Para AN usa la tabla manual; sin fila aprobada no hay país ni página. */
export function mapCityCountry(
  cityId: number,
  country: CountryMapping,
  an: readonly AnCity[],
  provider = "freetour",
): CountryMapping & { reason?: string } {
  if (!country.perCity) return country;
  const row = an.find((r) => r.provider === provider && r.providerCityId === cityId && r.estado === "aprobado");
  if (!row) return { ...country, countryCode: null, indexable: false, reason: "AN: falta decidir CW/SX/BQ para esta ciudad (an-cities.csv)" };
  return { ...country, countryCode: row.countryCode, perCity: false, indexable: country.indexable };
}
