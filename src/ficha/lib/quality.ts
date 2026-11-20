/**
 * REQ-10824 · Ficha única, ola 6 (plan §2: `lib/quality.ts`, «mínimo de publicación para tours por API»). Decisión 50
 * (REQ-10627, PO 14-11-2026): «A: lo que no cumple el mínimo queda oculto y sale en un reporte. Antes de encender se
 * le informa al PO cuántos tours quedarían ocultos». Plan §4: «Sin descripción, foto o precio queda oculto y sale en
 * el reporte». Bandera `PROVIDER_QUALITY_GATE_ENABLED` (apagada): apagada, nada se oculta.
 * - Aplica solo a tours por API (Tangol, FREETOUR, Big Bus): los viajes de agencia se curan a mano.
 * - Gratis (0) es un precio real; falta precio solo cuando el modelo trae `null`.
 * - La descripción vale con `descriptionHtml` con texto o con `brief`.
 * Puro.
 */
import type { FichaModel } from "./model";
import { htmlToText } from "./text";

export type QualityMissing = "descripcion" | "foto" | "precio";
export interface QualityCheck { ok: boolean; missing: QualityMissing[] }

/** Proveedores cuyas fichas llegan por API (plan P: «informe de calidad con el número de tours que quedarían ocultos»). */
export const API_PROVIDERS: ReadonlySet<string> = new Set(["tangol", "freetour", "bigbus"]);

// REQ-10824
export function qualityCheck(f: Pick<FichaModel, "descriptionHtml" | "brief" | "gallery" | "price">): QualityCheck {
  const missing: QualityMissing[] = [];
  const texto = htmlToText(f.descriptionHtml).trim() || (f.brief ?? "").trim();
  if (!texto) missing.push("descripcion");
  if (!f.gallery.some((m) => m.url.trim())) missing.push("foto");
  if (f.price === null) missing.push("precio");
  return { ok: missing.length === 0, missing };
}

/** ¿Esta ficha queda oculta por calidad? Solo con la bandera encendida y solo tours por API. */
// REQ-10824
export function hiddenByQuality(f: FichaModel, o: { gateEnabled: boolean; apiProviders?: ReadonlySet<string> }): boolean {
  if (!o.gateEnabled) return false;
  if (!(o.apiProviders ?? API_PROVIDERS).has(f.provider)) return false;
  return !qualityCheck(f).ok;
}

export interface QualityReport {
  /** Tours por API evaluados. */
  total: number;
  hidden: number;
  byProvider: Record<string, { total: number; hidden: number }>;
  items: { id: string; provider: string; missing: QualityMissing[] }[];
}

/** Informe para el PO antes de encender la bandera: cuántos quedarían ocultos y por qué. Solo lectura. */
// REQ-10824
export function qualityReport(fichas: FichaModel[], apiProviders: ReadonlySet<string> = API_PROVIDERS): QualityReport {
  const r: QualityReport = { total: 0, hidden: 0, byProvider: {}, items: [] };
  for (const f of fichas) {
    if (!apiProviders.has(f.provider)) continue;
    r.total++;
    const p = (r.byProvider[f.provider] ??= { total: 0, hidden: 0 });
    p.total++;
    const q = qualityCheck(f);
    if (!q.ok) {
      r.hidden++; p.hidden++;
      r.items.push({ id: f.id, provider: f.provider, missing: q.missing });
    }
  }
  return r;
}
