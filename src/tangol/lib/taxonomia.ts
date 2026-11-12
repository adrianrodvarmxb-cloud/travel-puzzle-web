/**
 * REQ-3465: de un tour de Tangol a la categoría del mapeo de la taxonomía (`src/taxonomy/data/mapping/tangol.json`).
 * Puro: recibe el tour y la tabla de códigos por parámetro; sin red, base, reloj ni azar.
 *
 * Tangol manda `TypeCode`, `SubTypeCode` y `TourType` en cada tour (`src/tangol/lib/schemas.ts`), pero HOY el repo no
 * tiene ni un valor de esos campos ni su significado: `docs/tangol-inventario-2026-11-11.md` solo trae conteos por país
 * y ciudad. Mientras el proveedor no confirme su lista, todos los tours van a la categoría comodín del mapeo: así
 * ninguno cae en «por-revisar» y el tipo lo deciden la duración y las palabras del título.
 *
 * Los ids son enteros porque `Tour.categoryId` es `Int` y FREETOUR ya ocupa 1–35: Tangol usa un rango reservado desde
 * 9,000,001, la misma convención que el PO aceptó para `City.id` en REQ-1624.
 */

/** Primer número del rango reservado para las categorías de Tangol. */
export const RANGO_TANGOL_DESDE = 9_000_000;

/** Id de la categoría comodín de `mapping/tangol.json`. */
export const CATEGORIA_TANGOL_SIN_TIPO = 9_000_001;

/**
 * Códigos de Tangol confirmados por el proveedor (en mayúsculas) → id de categoría del mapeo. Vacío a propósito:
 * ningún `TypeCode` ni `SubTypeCode` está confirmado. Al confirmarse, el código entra aquí y su categoría en
 * `mapping/tangol.json` con el siguiente id del rango.
 */
export const CODIGOS_TANGOL: Readonly<Record<string, number>> = {};

export interface TourConTipo {
  typeCode?: string | null;
  subTypeCode?: string | null;
}

/** Categoría del mapeo que le toca a un tour de Tangol. Gana `TypeCode`; si no está confirmado, `SubTypeCode`. */
// REQ-3465
export function categoriaIdDeTangol(
  tour: TourConTipo,
  codigos: Readonly<Record<string, number>> = CODIGOS_TANGOL,
): number {
  for (const raw of [tour.typeCode, tour.subTypeCode]) {
    const codigo = raw?.trim().toUpperCase();
    if (codigo && codigos[codigo] !== undefined) return codigos[codigo];
  }
  return CATEGORIA_TANGOL_SIN_TIPO;
}
