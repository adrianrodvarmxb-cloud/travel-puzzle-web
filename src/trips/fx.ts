/** Tipo de cambio FIX de Banxico (SIE API): USD SF43718, EUR SF46410. Una consulta al día (caché). */
import type { FxRates } from "./lib/money";

const URL = "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718,SF46410/datos/oportuno";

export function parseBanxico(json: unknown): FxRates | null {
  const series = (json as { bmx?: { series?: { idSerie: string; datos?: { fecha: string; dato: string }[] }[] } })?.bmx?.series ?? [];
  const get = (id: string) => series.find((s) => s.idSerie === id)?.datos?.[0];
  const usd = get("SF43718");
  const eur = get("SF46410");
  const u = Number(usd?.dato);
  const e = Number(eur?.dato);
  if (!usd || !eur || !Number.isFinite(u) || !Number.isFinite(e) || u <= 0 || e <= 0) return null;
  return { USD: u, EUR: e, date: usd.fecha };
}

interface Deps {
  token: string;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  cache: { get(): Promise<FxRates | null>; put(r: FxRates): Promise<unknown> };
}

export async function getFxRates(d: Deps): Promise<FxRates | null> {
  const cached = await d.cache.get().catch(() => null);
  if (cached) return cached;
  if (!d.token) return null;
  try {
    const res = await d.fetch(URL, { headers: { "Bmx-Token": d.token, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const rates = parseBanxico(await res.json());
    if (rates) await d.cache.put(rates).catch(() => {});
    return rates;
  } catch {
    return null;
  }
}
