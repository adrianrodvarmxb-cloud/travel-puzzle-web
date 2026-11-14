/**
 * REQ-10536 / REQ-10537 / REQ-10538 / REQ-10539: carga de los datos prácticos de la ficha (columnas de la 0031 y la
 * 0032 en "Tour"). No van por Prisma a propósito (las columnas no están en prisma/schema.prisma, ver la 0031): se
 * leen con SQL aparte por id del tour. Si la 0032 no está aplicada, se reintenta solo con las columnas de la 0031
 * (Condiciones, horarios e idiomas siguen); si la base falla, null y la ficha sigue sin los bloques (regla 7).
 * I/O: recibe la base por parámetro (DIP); la lógica pura vive en `lib/practical-info.ts`.
 */
import { translations } from "@/lib/translations";
import { providerSql, type ProviderVisibilityEnv } from "@/catalog/lib/provider-visibility";
import type { SupportedLanguage } from "@/types";
import { practicalInfo, type PracticalView } from "./lib/practical-info";

type D1 = { prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } } };

/** 0031 (+ providerId y guideLanguages, que ya existían). */
export const BASE_COLUMNS = ["providerId", "guideLanguages", "excludes", "cancellationPolicy", "availabilityRules"] as const;
/** 0031 + 0032. */
export const PRACTICAL_COLUMNS = [
  ...BASE_COLUMNS,
  "endPoint", "whatToBring", "physicalRequirements", "difficulty", "providerNotes", "childAgeFrom", "childAgeTo", "infantAgeFrom", "infantAgeTo",
] as const;

/** Gate C (REQ-3311): un proveedor tras su bandera apagada no sale ni en estos datos. */
const select = (cols: readonly string[], env: ProviderVisibilityEnv) =>
  `SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "Tour" WHERE "id" = ?1${providerSql(env)} LIMIT 1`;

/** Etiquetas con el sistema de traducciones del sitio; si el idioma no tiene la llave, inglés. */
// REQ-10538
export function translator(lang: string): (key: string) => string {
  const table = translations[lang as SupportedLanguage] ?? translations.en;
  return (key) => table[key] ?? translations.en[key] ?? key;
}

// REQ-10536, REQ-10537, REQ-10538, REQ-10539, REQ-3311
export async function loadPracticalInfo(db: D1, tourId: string, lang: string, env: ProviderVisibilityEnv): Promise<PracticalView | null> {
  let rows: Record<string, unknown>[];
  try {
    rows = (await db.prepare(select(PRACTICAL_COLUMNS, env)).bind(tourId).all()).results;
  } catch (e) {
    if (!/no such column/i.test((e as Error).message)) { console.error("[ficha] datos prácticos:", (e as Error).message); return null; }
    console.warn("[ficha] la migración 0032 no está aplicada; se leen solo las columnas de la 0031");
    try {
      rows = (await db.prepare(select(BASE_COLUMNS, env)).bind(tourId).all()).results;
    } catch (e2) {
      console.error("[ficha] datos prácticos (0031):", (e2 as Error).message);
      return null;
    }
  }
  const row = rows[0];
  return row ? practicalInfo(row, { lang, tr: translator(lang) }) : null;
}
