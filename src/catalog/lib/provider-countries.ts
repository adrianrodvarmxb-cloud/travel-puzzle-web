/**
 * Alta de los países que solo tiene un proveedor (REQ-3441/REQ-3442; PO 12 nov 2026, «métela de una vez»).
 *
 * El catálogo de países se armó con la lista de Freetour, así que un país que solo trae otro proveedor
 * (Paraguay, con 1 tour de Tangol en Asunción) no existe en `Country` y sus tours se quedan sin país.
 *
 * Puro: recibe los países del proveedor y los que YA existen por parámetro (DIP); no lee ni escribe la base.
 * Quien hace el I/O (el sync del proveedor) decide qué insertar con lo que aquí se devuelve.
 *
 * Mismo criterio que las ciudades de REQ-1624/REQ-3368 (`src/tangol/lib/cities.ts`), para que el repo no
 * tenga dos reglas distintas:
 *  - antes de crear nada se hace el CRUCE (aquí por `iso2` en mayúsculas, que es la llave natural del país);
 *  - el id de un país nuevo sale del rango reservado del proveedor (desde 9,000,000; Tangol 9,000,001…),
 *    para que nunca choque con los ids de Freetour;
 *  - un proveedor sin rango registrado NO recibe ids: queda en `pendientes` (nadie inventa un id).
 * `Country` y `City` son tablas distintas, así que el mismo número en las dos no es un choque.
 *
 * El `code` se resuelve con la regla que ya existe en el repo (`avoidCodeClashes`, `Country.code` es único).
 */
import { avoidCodeClashes } from "./tour-rows";
import { countryIso2, iso2FromCountry } from "@/destinations/lib/ids";

/** País que ya está en el catálogo (los ids son los de Freetour). */
export interface ExistingCountry {
  id: number;
  code: string;
  iso2: string | null;
}

/** País tal como lo da el proveedor: su ISO-2 y el nombre en los dos idiomas del sitio. */
export interface ProviderCountry {
  iso2: string;
  translations: { es: string; en: string } & Record<string, string>;
}

/** Lista de países propios de un proveedor (una entrada por proveedor en el archivo de datos). */
export interface ProviderCountryList {
  provider: string;
  paises: readonly ProviderCountry[];
}

/** País que hay que crear, ya con id y code resueltos (listo para `upsertCountries` + `iso2`). */
export interface NewCountry {
  id: number;
  code: string;
  iso2: string;
  translations: Record<string, string>;
}

/** Cómo quedó ligado cada país que pide el proveedor. */
export interface ProviderCountryRow {
  provider: string;
  iso2: string;
  countryId: number;
  /** `catalogo` = ya existía (o lo creó otro proveedor en este mismo plan); `nuevo` = se crea aquí. */
  source: "catalogo" | "nuevo";
}

export interface PendingCountry {
  provider: string;
  iso2: string;
  reason: string;
}

export interface ProviderCountryPlan {
  /** Una fila por país del proveedor que quedó resuelto. */
  mapeo: ProviderCountryRow[];
  /** Países a crear (ids que nunca chocan con los de Freetour). */
  nuevos: NewCountry[];
  /** Países que NO se resolvieron: nadie debe inventarles un id. */
  pendientes: PendingCountry[];
}

/** REQ-3441: desde aquí arrancan los rangos reservados por proveedor; debajo viven los ids de Freetour. */
export const RESERVED_COUNTRY_ID_MIN = 9_000_000;
/** Tamaño del bloque de cada proveedor, igual que en las ciudades (REQ-3368). */
export const RESERVED_COUNTRY_ID_BLOCK = 100_000;

/**
 * Un proveedor sin rango registrado NO recibe ids: se registra aquí a mano para que dos proveedores
 * nunca compartan bloque (el siguiente empezaría en 9,100,001).
 */
const PROVIDER_RANGE_START: Record<string, number> = {
  tangol: RESERVED_COUNTRY_ID_MIN + 1,
  exotic: RESERVED_COUNTRY_ID_MIN + RESERVED_COUNTRY_ID_BLOCK + 1,
};

export interface IdRange {
  start: number;
  end: number;
}

/** REQ-3441: rango reservado del proveedor, o null si no tiene uno registrado. */
// REQ-3441
export function providerCountryIdRange(provider: string): IdRange | null {
  const start = PROVIDER_RANGE_START[provider.trim().toLowerCase()];
  return start === undefined ? null : { start, end: start + RESERVED_COUNTRY_ID_BLOCK - 1 };
}

export type CountryCross = { match: number } | { nuevo: true };

/**
 * REQ-3441: ¿este país del proveedor ya existe? El cruce es por `iso2` en mayúsculas, con la regla que ya
 * usa el sitio para leer el ISO-2 de una fila (`countryIso2`, REQ-1264: la fila subnacional SCT cuelga de GB).
 * Entre varias filas con el mismo ISO-2 gana la que lo trae en su propia columna y, a igualdad, el id menor.
 */
// REQ-3441
export function crossProviderCountry(country: ProviderCountry, countries: readonly ExistingCountry[]): CountryCross {
  const iso = (country.iso2 ?? "").trim().toUpperCase();
  if (!iso) return { nuevo: true };
  const match = countries
    .filter((c) => countryIso2(c) === iso)
    .sort((a, b) => Number(!(a.iso2 ?? "").trim()) - Number(!(b.iso2 ?? "").trim()) || a.id - b.id)[0];
  return match ? { match: match.id } : { nuevo: true };
}

export interface PlanInput {
  providers: readonly ProviderCountryList[];
  countries: readonly ExistingCountry[];
  /** Solo para pruebas y para un proveedor con bloque propio; por omisión, el rango registrado. */
  ranges?: Readonly<Record<string, IdRange>>;
}

interface Group {
  iso: string;
  /** Proveedores que pidieron este país nuevo, en orden. El primero con rango le presta el id. */
  pedidos: string[];
  translations: Record<string, string>;
}

/**
 * REQ-3441: plan completo de los países propios de uno o varios proveedores. Devuelve el mapeo de cada país,
 * los países que hay que crear (con id y code) y lo que queda pendiente. No escribe nada.
 *
 * El mismo país nuevo pedido por dos proveedores es UN solo país: lo crea el primero que lo pide y el
 * segundo lo encuentra ya resuelto (`source: "catalogo"`).
 */
// REQ-3441
export function planProviderCountries({ providers, countries, ranges }: PlanInput): ProviderCountryPlan {
  const mapeo: ProviderCountryRow[] = [];
  const pendientes: PendingCountry[] = [];
  const grupos: Group[] = [];
  const porIso = new Map<string, Group>();
  // Países que ya se resolvieron en este plan (los que vienen de la base más los creados aquí).
  const resuelto = new Map<string, number>();

  // Paso 1: cruce. Lo que ya existe se liga; lo demás se agrupa por ISO-2 (un país nuevo, una sola vez).
  for (const { provider, paises } of providers) {
    const orden = [...paises].sort((a, b) => String(a.iso2).toUpperCase().localeCompare(String(b.iso2).toUpperCase()));
    for (const pais of orden) {
      const crudo = (pais.iso2 ?? "").trim().toUpperCase();
      const iso = iso2FromCountry({ code: crudo });
      if (!iso) {
        pendientes.push({ provider, iso2: crudo, reason: `«${crudo}» no es un ISO 3166-1 alfa-2` });
        continue;
      }
      const yaResuelto = resuelto.get(iso);
      if (yaResuelto !== undefined) {
        mapeo.push({ provider, iso2: iso, countryId: yaResuelto, source: "catalogo" });
        continue;
      }
      const cross = crossProviderCountry({ ...pais, iso2: iso }, countries);
      if ("match" in cross) {
        resuelto.set(iso, cross.match);
        mapeo.push({ provider, iso2: iso, countryId: cross.match, source: "catalogo" });
        continue;
      }
      const es = (pais.translations?.es ?? "").trim();
      const en = (pais.translations?.en ?? "").trim();
      if (!es || !en) {
        pendientes.push({ provider, iso2: iso, reason: "falta el nombre en es o en en" });
        continue;
      }
      const yaAgrupado = porIso.get(iso);
      if (yaAgrupado) {
        // Otro proveedor de esta misma corrida ya pidió el mismo país nuevo: es UN solo país.
        yaAgrupado.pedidos.push(provider);
        continue;
      }
      const grupo: Group = { iso, pedidos: [provider], translations: { ...pais.translations, es, en } };
      porIso.set(iso, grupo);
      grupos.push(grupo);
    }
  }

  // Paso 2: ids. El siguiente libre del rango del primer proveedor que lo pidió y tiene rango; un id ya usado se salta.
  const taken = new Set<number>(countries.map((c) => c.id));
  const cursores = new Map<string, number>();
  const asignados: (Group & { id: number; dueno: string })[] = [];
  const banda = (provider: string) => ranges?.[provider.trim().toLowerCase()] ?? providerCountryIdRange(provider);
  for (const g of grupos) {
    const dueno = g.pedidos.find((p) => banda(p));
    if (!dueno) {
      for (const p of g.pedidos) pendientes.push({ provider: p, iso2: g.iso, reason: `el proveedor ${p} no tiene rango de ids reservado` });
      continue;
    }
    const band = banda(dueno)!;
    const clave = dueno.trim().toLowerCase();
    let cursor = cursores.get(clave) ?? band.start;
    while (cursor <= band.end && taken.has(cursor)) cursor++;
    if (cursor > band.end) {
      for (const p of g.pedidos) pendientes.push({ provider: p, iso2: g.iso, reason: `rango reservado de ${dueno} agotado (${band.start}–${band.end})` });
      continue;
    }
    taken.add(cursor);
    cursores.set(clave, cursor + 1);
    asignados.push({ ...g, id: cursor, dueno });
  }

  // Paso 3: code. `Country.code` es único: se usa el ISO-2 y, si otro país ya lo tiene, la regla del repo
  // le agrega el id (`avoidCodeClashes`), la misma que usa hoy `upsertCountries`.
  const nuevos: NewCountry[] = avoidCodeClashes(
    asignados.map((g) => ({ id: g.id, code: g.iso, iso2: g.iso, translations: g.translations })),
    countries.map((c) => ({ id: c.id, code: c.code })),
  );

  // Paso 4: el mapeo de los países creados aquí. El dueño del id lo marca `nuevo`; los demás proveedores
  // que pidieron el mismo país apuntan al MISMO id (`catalogo`): un solo país, no uno por proveedor.
  for (const g of asignados) {
    resuelto.set(g.iso, g.id);
    for (const p of g.pedidos) mapeo.push({ provider: p, iso2: g.iso, countryId: g.id, source: p === g.dueno ? "nuevo" : "catalogo" });
  }
  const pedido = new Map<string, number>();
  providers.forEach(({ provider }, i) => pedido.set(provider, i));
  mapeo.sort((a, b) => (pedido.get(a.provider) ?? 0) - (pedido.get(b.provider) ?? 0) || a.iso2.localeCompare(b.iso2));

  return { mapeo, nuevos, pendientes };
}

/**
 * REQ-3442: valida el archivo de datos (`data/paises-de-proveedor.json`) y lo convierte en listas por
 * proveedor. Una entrada mal escrita se rechaza con error en vez de inventarse: el dato entra por PR.
 */
// REQ-3442
export function parseProviderCountries(raw: unknown): ProviderCountryList[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("paises-de-proveedor: se esperaba un objeto { proveedor: [...] }");
  return Object.entries(raw as Record<string, unknown>).map(([provider, lista]) => {
    if (!Array.isArray(lista)) throw new Error(`paises-de-proveedor: «${provider}» debe traer un arreglo de países`);
    const paises = lista.map((p) => {
      const iso2 = typeof (p as ProviderCountry)?.iso2 === "string" ? (p as ProviderCountry).iso2.trim().toUpperCase() : "";
      if (!/^[A-Z]{2}$/.test(iso2)) throw new Error(`paises-de-proveedor: «${provider}» trae un iso2 inválido (${JSON.stringify((p as ProviderCountry)?.iso2)})`);
      const t = (p as ProviderCountry).translations;
      const es = typeof t?.es === "string" ? t.es.trim() : "";
      const en = typeof t?.en === "string" ? t.en.trim() : "";
      if (!es || !en) throw new Error(`paises-de-proveedor: ${provider}/${iso2} necesita nombre en es y en en`);
      return { iso2, translations: { ...t, es, en } };
    });
    return { provider, paises };
  });
}
