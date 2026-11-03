/** Continente de cada país (código ISO-2). Lo que no está aquí se ignora en la sección por continente. */
export type Continent = "america-norte" | "america-sur" | "europa" | "asia" | "africa" | "oceania";

const CODES: Record<Continent, string> = {
  "america-norte": "MX US CA GT BZ HN SV NI CR PA CU DO HT JM PR BS BB TT AW CW LC GD AG DM KN VC",
  "america-sur": "AR BR CL CO PE EC BO PY UY VE GY SR",
  europa:
    "ES FR IT PT DE GB IE NL BE LU CH AT PL CZ SK HU RO BG GR HR SI RS BA ME MK AL XK DK SE NO FI IS EE LV LT UA MD BY MT CY MC SM VA AD LI RU",
  asia: "JP CN KR TW HK MO TH VN KH LA MM MY SG ID PH IN NP LK BD PK AE QA OM BH KW SA JO IL PS LB TR GE AM AZ UZ KZ KG TJ MN IR IQ MV BT",
  africa: "MA EG TN DZ ZA KE TZ UG RW ET NA BW ZW ZM MZ MG MU SC SN GH NG CV CI CM GA",
  oceania: "AU NZ FJ PF NC PG WS TO VU",
};

const BY_CODE = new Map<string, Continent>(
  (Object.entries(CODES) as [Continent, string][]).flatMap(([c, list]) => list.split(" ").map((code) => [code, c] as const))
);

export const CONTINENTS: Continent[] = ["america-norte", "america-sur", "europa", "asia", "africa", "oceania"];

export function continentOf(code: string | null | undefined): Continent | null {
  return code ? BY_CODE.get(code.trim().toUpperCase()) ?? null : null;
}

export interface ContinentSummary {
  continent: Continent;
  tours: number;
  countries: number;
  /** Países con más tours primero (máx. 4), para mostrar como accesos. */
  top: { countryId: number; code: string; tours: number }[];
}

/** Agrupa el conteo de tours por país en continentes; solo devuelve continentes con tours. */
export function groupByContinent(rows: { countryId: number; code: string; tours: number }[]): ContinentSummary[] {
  const acc = new Map<Continent, ContinentSummary>();
  for (const r of rows) {
    const c = continentOf(r.code);
    if (!c || r.tours <= 0) continue;
    const s = acc.get(c) ?? { continent: c, tours: 0, countries: 0, top: [] };
    s.tours += r.tours;
    s.countries += 1;
    s.top.push(r);
    acc.set(c, s);
  }
  return CONTINENTS.flatMap((c) => {
    const s = acc.get(c);
    if (!s) return [];
    s.top = [...s.top].sort((a, b) => b.tours - a.tours).slice(0, 4);
    return [s];
  });
}
