/**
 * Prioridad de la identidad de una ciudad (REQ-133, REQ-136). Puro.
 * override humano (src/geo/data/city-overrides.csv, revisado por PR) > id exacto ya guardado > aproximado.
 * Un geonameid ya aceptado nunca se mueve solo: si el aproximado difiere, se reporta como diferencia de control.
 */
import { parseCsv, toId } from "./csv";
import type { MatchStatus } from "./score";

export type OverrideAction = "asignar" | "no-indexar" | "sin-geonameid";

export interface CityOverride {
  provider: string;
  providerCityId: number;
  action: OverrideAction;
  geonameid: number | null;
  note: string;
}

const ACTIONS: readonly OverrideAction[] = ["asignar", "no-indexar", "sin-geonameid"];

/** REQ-136: lee city-overrides.csv; descarta acciones inválidas y «asignar» sin geonameid. Llave «provider:id». */
export function parseCityOverrides(text: string): Map<string, CityOverride> {
  const out = new Map<string, CityOverride>();
  for (const r of parseCsv(text)) {
    const id = toId(r.provider_city_id);
    const action = r.accion as OverrideAction;
    const geonameid = toId(r.geonameid);
    if (!r.provider || !id || !ACTIONS.includes(action) || (action === "asignar" && !geonameid)) continue;
    out.set(`${r.provider}:${id}`, { provider: r.provider, providerCityId: id, action, geonameid: action === "asignar" ? geonameid : null, note: r.nota ?? "" });
  }
  return out;
}

export type ResolvedStatus = MatchStatus | "sin-pagina";

export interface Resolution {
  status: ResolvedStatus;
  geonameid: number | null;
  source: "override" | "id" | "aproximado";
  reason: string;
  /** El geonameid guardado difiere del aproximado (control: debe ser 0 o revisarse). */
  controlDiff: boolean;
}

/** REQ-133/REQ-136: resuelve con la prioridad override > id exacto > aproximado. */
export function resolveCity(
  input: { provider: string; cityId: number; storedGeonameid: number | null | undefined; approx: { status: MatchStatus; geonameid: number | null; reason: string } },
  overrides: ReadonlyMap<string, CityOverride>,
): Resolution {
  const o = overrides.get(`${input.provider}:${input.cityId}`);
  const approxAuto = input.approx.status === "auto" ? input.approx.geonameid : null;
  if (o) {
    if (o.action === "no-indexar") return { status: "sin-pagina", geonameid: null, source: "override", reason: `override: no indexar${o.note ? ` (${o.note})` : ""}`, controlDiff: false };
    if (o.action === "sin-geonameid") return { status: "auto", geonameid: null, source: "override", reason: `override: sin geonameid${o.note ? ` (${o.note})` : ""}`, controlDiff: false };
    return { status: "auto", geonameid: o.geonameid, source: "override", reason: `override${o.note ? ` (${o.note})` : ""}`, controlDiff: false };
  }
  if (input.storedGeonameid) {
    const diff = input.approx.geonameid !== null && input.approx.geonameid !== input.storedGeonameid;
    return { status: "auto", geonameid: input.storedGeonameid, source: "id", reason: diff ? `guardado; el aproximado propone ${input.approx.geonameid}` : "guardado", controlDiff: diff };
  }
  return { status: input.approx.status, geonameid: approxAuto, source: "aproximado", reason: input.approx.reason, controlDiff: false };
}
