/** REQ-290: GET /api/search/suggest?q=&language= → sugerencias agrupadas. 404 con SEARCH_SUGGEST_ENABLED apagada. */
import { NextRequest, NextResponse } from "next/server";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { fold } from "@/search/lib/normalize";
import { isSearchSuggest, suggestFor } from "@/search/suggest";
import { pickLanguage, suggestDeps } from "@/search/suggest-deps";

export async function GET(request: NextRequest) {
  if (!isSearchSuggest(process.env.SEARCH_SUGGEST_ENABLED)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const language = pickLanguage(request.nextUrl.searchParams.get("language"));
  try {
    const body = await cached(cacheKey("suggest", { language, q: fold(q).slice(0, 80), v: 1 }), POLICY.toursList, async () => (await suggestFor(suggestDeps(), q, language)) ?? { q, corrected: false, correctedLabel: null, items: [] });
    return NextResponse.json(body);
  } catch (error) {
    console.error("[busqueda] sugerencias no disponibles:", (error as Error).message);
    return NextResponse.json({ q, corrected: false, correctedLabel: null, items: [] });
  }
}
