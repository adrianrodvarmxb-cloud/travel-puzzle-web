/**
 * REQ-3502 (reemplaza a REQ-3465): de un tour de Tangol a la categoría del mapeo de la taxonomía
 * (`src/taxonomy/data/mapping/tangol.json`), categoría por categoría como `freetour.json`.
 * Puro: recibe el tour y la tabla de códigos por parámetro; sin red, base, reloj ni azar.
 *
 * Los pares `TypeCode|SubTypeCode` son los REALES que leyó la corrida de solo lectura REQ-3487 (43303152904: 184 destinos,
 * 2,059 tours, 39 tipos; tabla en `tests/fixtures/tangol-tipos-2026-11-12.json`). `TourType` (1 = promo o paquete,
 * 2 = servicio) no cambia la categoría. El SubTypeCode «[METHOD ERROR 504]» es basura del servidor de Tangol: no se mapea.
 *
 * Los ids son enteros porque `Tour.categoryId` es `Int` y FREETOUR ya ocupa 1–35: Tangol usa un rango reservado desde
 * 9,000,001, la misma convención que el PO aceptó para `City.id` en REQ-1624.
 */

/** Primer número del rango reservado para las categorías de Tangol. */
export const RANGO_TANGOL_DESDE = 9_000_000;

/** Red de seguridad de `mapping/tangol.json`: la recibe un par que no está en la tabla (tipo nuevo de Tangol). */
export const CATEGORIA_TANGOL_SIN_TIPO = 9_000_001;

/** `TypeCode|SubTypeCode` de Tangol (en mayúsculas) → id de categoría del mapeo. */
export const CODIGOS_TANGOL: Readonly<Record<string, number>> = {
  "EXCURSION|CLASICAS": 9_000_002,
  "EXCURSION|AVENTURA": 9_000_003,
  "EXCURSION|GASTRONOMICO": 9_000_004,
  "EXCURSION|ATRACCIONES": 9_000_005,
  "EXCURSION|WALKINGTOURS": 9_000_006,
  "EXCURSION|ESTANCIAS": 9_000_007,
  "EXCURSION|SHOREEXCURSIONS": 9_000_008,
  "EXCURSION|EN TREN": 9_000_009,
  "EXCURSION|HELICOPTERO": 9_000_010,
  "TRASLADO|IN": 9_000_011,
  "TRASLADO|OUT": 9_000_012,
  "TRASLADO|IN/OUT": 9_000_013,
  "TRASLADO|TRF": 9_000_014,
  "TRASLADO|TRF IN": 9_000_015,
  "TRASLADO|TRFOUTBUS": 9_000_016,
  "TRASLADO|TRFINBUS": 9_000_017,
  "VIAJES|CLASICOS": 9_000_018,
  "VIAJES|ALLINCLUSIVE": 9_000_019,
  "VIAJES|ESCAPADAS": 9_000_020,
  "VIAJES|AVENTURA": 9_000_021,
  "VIAJES|SELF-DRIVE": 9_000_022,
  "VIAJES|FESTIVALES": 9_000_023,
  "VIAJES|FLYDRIVE": 9_000_024,
  "VIAJES|GLAMPING": 9_000_025,
  "PASES|PASS": 9_000_026,
  "PASES|TKTBUS": 9_000_027,
  "SHOW|SHOW": 9_000_028,
  "SHOW|TANGO": 9_000_029,
  "CLASES|CLASES POR HORA": 9_000_030,
  "CLASES|CLASES DE SAMBA": 9_000_031,
  "ALQUILERES|ALQUILER POR HORA": 9_000_032,
  "ALQUILERES|ALQUILERDEAUTO": 9_000_033,
  "CRUCERO|CRUCERO": 9_000_034,
};

export interface TourConTipo {
  typeCode?: string | null;
  subTypeCode?: string | null;
}

/** Clave de la tabla: `TYPECODE|SUBTYPECODE`, sin espacios en los extremos y en mayúsculas. */
// REQ-3502
export function claveTangol(tour: TourConTipo): string {
  const n = (s?: string | null) => (s ?? "").trim().toUpperCase();
  return `${n(tour.typeCode)}|${n(tour.subTypeCode)}`;
}

/** Categoría del mapeo que le toca a un tour de Tangol: la de su par; si el par no está en la tabla, la red de seguridad. */
// REQ-3502
export function categoriaIdDeTangol(
  tour: TourConTipo,
  codigos: Readonly<Record<string, number>> = CODIGOS_TANGOL,
): number {
  return codigos[claveTangol(tour)] ?? CATEGORIA_TANGOL_SIN_TIPO;
}
