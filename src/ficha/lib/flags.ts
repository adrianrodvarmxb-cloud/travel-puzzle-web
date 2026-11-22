/**
 * REQ-10859 · Banderas de la plantilla única (plan §7: `FICHA_UNICA_TANGOL_ENABLED`, `FICHA_UNICA_FREETOUR_ENABLED`,
 * `FICHA_UNICA_TRIP_ENABLED`; «apagar la bandera del proveedor devuelve la plantilla actual»). Tres valores:
 * - "false": la plantilla de hoy en todas partes (regreso);
 * - "preview": la plantilla nueva solo en las versiones sin tráfico (`*.workers.dev`, localhost): el humo del PR y la
 *   revisión visual del PO la ven; producción sigue como hoy;
 * - "true": la plantilla nueva en producción.
 * Puro: recibe el valor de la bandera y el host de la petición; no lee `process.env`.
 */
export type FichaUnicaMode = "false" | "preview" | "true";

export type FichaUnicaProvider = "tangol" | "freetour" | "trip";

const VAR: Record<FichaUnicaProvider, string> = {
  tangol: "FICHA_UNICA_TANGOL_ENABLED",
  freetour: "FICHA_UNICA_FREETOUR_ENABLED",
  trip: "FICHA_UNICA_TRIP_ENABLED",
};

// REQ-10859
export function fichaUnicaMode(value: string | undefined | null): FichaUnicaMode {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "preview" ? v : "false";
}

/** ¿El host es una versión sin tráfico (preview de Workers) o un entorno local? */
// REQ-10859
export function isPreviewHost(host: string | null | undefined): boolean {
  const h = (host ?? "").trim().toLowerCase().split(":")[0];
  return h.endsWith(".workers.dev") || h === "localhost" || h === "127.0.0.1";
}

/** ¿Se monta la plantilla nueva para este proveedor en esta petición? */
// REQ-10859
export function fichaUnicaOn(env: Record<string, string | undefined>, provider: FichaUnicaProvider, host: string | null | undefined): boolean {
  const mode = fichaUnicaMode(env[VAR[provider]]);
  if (mode === "true") return true;
  if (mode === "preview") return isPreviewHost(host);
  return false;
}

/** Proveedor de la bandera que corresponde a una fila de `Tour` o de `Trip`; null = sin plantilla nueva para él. */
// REQ-10859
export function fichaUnicaProviderFor(table: "tour" | "trip", providerId: string | null | undefined): FichaUnicaProvider | null {
  if (table === "trip") return "trip";
  const p = (providerId ?? "").trim().toLowerCase();
  if (p === "tangol") return "tangol";
  if (p === "freetour") return "freetour";
  return null;
}
