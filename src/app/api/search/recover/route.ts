/** REQ-292: GET /api/search/recover?q=&language= → salidas para cero resultados. 404 con SEARCH_SUGGEST_ENABLED apagada. */
import { NextRequest, NextResponse } from "next/server";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { fold } from "@/search/lib/normalize";
import { isSearchSuggest, recoverFor } from "@/search/suggest";
import { pickLanguage, suggestDeps } from "@/search/suggest-deps";

export async function GET(request: NextRequest) {
  if (!isSearchSuggest(process.env.SEARCH_SUGGEST_ENABLED)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const language = pickLanguage(request.nextUrl.searchParams.get("language"));
  try {
    const body = await cached(cacheKey("recover", { language, q: fold(q).slice(0, 80), v: 1 }), POLICY.toursList, async () => recoverFor(suggestDeps(), q, language));
    return body ? NextResponse.json(body) : NextResponse.json({ error: "empty" }, { status: 400 });
  } catch (error) {
    console.error("[busqueda] recuperación no disponible:", (error as Error).message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
