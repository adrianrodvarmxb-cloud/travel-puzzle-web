// REQ-10874 (ola 9, decisión 32 / REQ-10610; fuente REQ-10767): el precio en la moneda del visitante se calcula AQUÍ,
// fuera del HTML de la ficha que guarda el borde 5 minutos (REQ-3318: `/api/*` nunca se guarda). El país sale de
// `cf-ipcountry` de esta petición; la tabla, de Banxico + Frankfurter (`loadFxTable`). Tras `LOCAL_CURRENCY_ENABLED`:
// apagada, 404 y el panel se queda con la moneda del proveedor. Nunca neto ni margen: el monto que llega es el público.
import { NextRequest, NextResponse } from "next/server";
import { localCurrencyOn } from "@/ficha/lib/flags";
import { localPrice } from "@/ficha/lib/local-price";
import { parseLocalPriceQuery } from "@/ficha/schemas/local-price-query";
import { loadFxTable } from "@/fx/table";
import { visitorCountryFrom } from "@/geo/lib/visitor-country";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

// REQ-10874
export async function GET(request: NextRequest) {
  if (!localCurrencyOn(process.env as Record<string, string | undefined>)) return NextResponse.json({ error: "apagado" }, { status: 404, headers: NO_STORE });
  const q = parseLocalPriceQuery(request.nextUrl.searchParams);
  if (!q) return NextResponse.json({ error: "consulta inválida" }, { status: 400, headers: NO_STORE });
  const visitorCountry = visitorCountryFrom((n) => request.headers.get(n));
  const fx = await loadFxTable().catch(() => null);
  const p = localPrice(q.price, { visitorCountry, fx, lang: q.lang });
  return NextResponse.json({ text: p.text, shown: p.shown, charge: p.charge, country: visitorCountry, date: fx?.date ?? null }, { headers: NO_STORE });
}
