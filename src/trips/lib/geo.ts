/**
 * Países (ISO 3166-1 alfa-2) por continente/región para la taxonomía geográfica
 * y para el código del viaje. Latinoamérica y el Caribe van juntos (LAT); EE. UU.,
 * Canadá y Groenlandia son NAM. Puro.
 */
export const CONTINENTS = ["LAT", "NAM", "EUR", "ASI", "AFR", "OCE"] as const;
export type Continent = (typeof CONTINENTS)[number];

export const CONTINENT_LABEL: Record<Continent, string> = {
  LAT: "Latinoamérica", NAM: "Norteamérica", EUR: "Europa", ASI: "Asia", AFR: "África", OCE: "Oceanía",
};

const BY_CONTINENT: Record<Continent, string> = {
  LAT: "MX GT BZ SV HN NI CR PA CU DO HT JM PR BS BB TT AG DM GD KN LC VC AW CW BQ SX MF BL GP MQ KY TC VG VI AI MS CO VE EC PE BO CL AR UY PY BR GY SR GF FK",
  NAM: "US CA GL PM BM",
  EUR: "ES PT FR IT DE AT CH LI BE NL LU IE GB IS NO SE FI DK EE LV LT PL CZ SK HU SI HR BA RS ME MK AL GR BG RO MD UA BY RU MT CY AD MC SM VA GI FO AX IM JE GG XK",
  ASI: "JP KR KP CN TW HK MO MN IN PK BD LK NP BT MV AF IR IQ SY LB JO IL PS SA AE QA BH KW OM YE TR GE AM AZ KZ UZ TM KG TJ TH VN LA KH MM MY SG ID PH BN TL",
  AFR: "EG MA DZ TN LY SD SS ET ER DJ SO KE UG TZ RW BI CD CG CF CM GA GQ ST NG NE TD ML BF SN GM GW GN SL LR CI GH TG BJ MR CV AO ZM ZW MW MZ MG MU SC KM RE YT NA BW ZA LS SZ EH SH",
  OCE: "AU NZ FJ PG SB VU NC PF WS TO KI TV NR FM MH PW CK NU WF AS GU MP",
};

const CONTINENT_OF = new Map<string, Continent>();
for (const c of CONTINENTS) for (const code of BY_CONTINENT[c].split(" ")) CONTINENT_OF.set(code, c);

export const COUNTRY_CODES = [...CONTINENT_OF.keys()];

export function isCountryCode(code: string): boolean {
  return CONTINENT_OF.has(code);
}

export function continentOf(code: string): Continent | null {
  return CONTINENT_OF.get(code) ?? null;
}

/** Un país → su código; varios del mismo continente → el continente; si no → MUL. Sin países → XX. */
export function regionOf(codes: string[]): string {
  if (codes.length === 0) return "XX";
  if (codes.length === 1) return codes[0];
  const set = new Set(codes.map(continentOf));
  const only = [...set][0];
  return set.size === 1 && only ? only : "MUL";
}

/** Nombre del país en el idioma pedido (Intl). */
export function countryName(code: string, lang = "es"): string {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** REQ-004: países de una tarjeta, resueltos una sola vez en el servidor (INC-001). */
export function cardPlaces(countries: string[], lang = "es"): string {
  return countries.slice(0, 3).map((c) => countryName(c, lang)).join(" · ");
}
