/**
 * Identificadores de destinos y tours (Ola 3, docs/diccionario-datos.md). Puro.
 * - País: ISO 3166-1 alfa-2.  - Ciudad: geonameid o ft:{id}.  - Tour: tour_uid (Tour.id) y llave (provider_id, external_id).
 */

export const DEFAULT_PROVIDER = "freetour";

/** ISO 3166-1 alfa-2 vigentes, más XK (Kosovo), de uso común aunque no esté en la norma. */
const ISO2 = new Set(
  (
    "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
    "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
    "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
    "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
    "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
    "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
    "UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
  ).split(" "),
);

/**
 * REQ-1264: países del proveedor que no son ISO-3166 pero son parte de uno (FREETOUR trae Escocia, Irlanda del Norte y Gales
 * aparte, sin ISO-2). Cuelgan del país ISO; los datos de D1 no se tocan.
 */
export const SUBNATIONAL_ISO2: Readonly<Record<string, string>> = { SCT: "GB", NIR: "GB", WLS: "GB", ENG: "GB" };

// REQ-1264: ISO-2 efectivo de una fila de Country (el guardado o, si falta, el del país al que pertenece).
export function countryIso2(c: { code: string; iso2: string | null }): string | null {
  const own = (c.iso2 ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(own)) return own;
  return SUBNATIONAL_ISO2[(c.code ?? "").trim().toUpperCase()] ?? null;
}

// REQ-1264: la misma regla en SQL, para las consultas que leen co."iso2".
export function ISO2_SQL(alias: string): string {
  const cases = Object.entries(SUBNATIONAL_ISO2).map(([k, v]) => `WHEN '${k}' THEN '${v}'`).join(" ");
  return `COALESCE(${alias}."iso2", CASE UPPER(${alias}."code") ${cases} END)`;
}

/**
 * REQ-1265: nombre ISO 3166 del país en los 6 idiomas del sitio, para las filas cuyo nombre del proveedor no es el del
 * país ISO (la fila GB trae «Inglaterra», y de GB cuelgan Escocia, Gales e Irlanda del Norte, REQ-1264). Al pintar; D1 no cambia.
 */
export const ISO_COUNTRY_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  GB: { es: "Reino Unido", en: "United Kingdom", pt: "Reino Unido", de: "Vereinigtes Königreich", fr: "Royaume-Uni", it: "Regno Unito" },
};

// REQ-1265: traducciones del país a pintar (las de la lista ISO si existen; si no, las de la base).
export function countryTranslations(iso2: string | null | undefined, translations: unknown): unknown {
  return (iso2 && ISO_COUNTRY_NAMES[iso2.toUpperCase()]) || translations;
}

/** Códigos que algunos sistemas usan y no son ISO. */
const ALIASES: Record<string, string> = { UK: "GB", EL: "GR" };

/** REQ-085: ISO-2 del país desde shortTitle de FREETOUR o Country.code (que puede traer «-id» si chocó). null = revisar a mano. */
export function iso2FromCountry(c: { code: string; shortTitle?: string | null }): string | null {
  for (const raw of [c.shortTitle, c.code]) {
    const code = (raw ?? "").trim().toUpperCase().replace(/-\d+$/, "");
    if (!/^[A-Z]{2}$/.test(code)) continue;
    const iso = ALIASES[code] ?? code;
    if (ISO2.has(iso)) return iso;
  }
  return null;
}

/** REQ-085: llave natural (provider_id, external_id). El external_id se guarda como texto. */
export function naturalKey(providerId: string, externalId: number | string): string {
  return `${providerId}:${String(externalId)}`;
}

/** REQ-085: tour_uid de un tour que ya existe (reaparece con su mismo id interno); null si es nuevo. */
export function resolveTourUid(
  existing: ReadonlyArray<{ id: string; providerId: string; externalId: number | string }>,
  providerId: string,
  externalId: number | string,
): string | null {
  const key = naturalKey(providerId, externalId);
  return existing.find((t) => naturalKey(t.providerId, t.externalId) === key)?.id ?? null;
}

/** REQ-085: city_code = geonameid; si aún no se cruza, ft:{id de FREETOUR}. */
export function cityCode(c: { id: number; geonameid?: number | null }): string {
  return c.geonameid ? String(c.geonameid) : `ft:${c.id}`;
}
