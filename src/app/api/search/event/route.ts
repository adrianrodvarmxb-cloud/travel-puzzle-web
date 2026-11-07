/**
 * REQ-340…342: POST /api/search/event {kind:"search"|"click", q, language, results?, position?}.
 * Sin IP, usuario, cookie ni agente: solo la consulta normalizada y contadores por día. 404 con SEARCH_LOG_ENABLED apagada.
 * Si SEARCH_FUZZY está encendida, «corregida» se calcula aquí (el navegador no lo decide).
 */
import { NextResponse } from "next/server";
import { getD1 } from "@/lib/prisma";
import { loadCatalog } from "@/catalog/snapshot";
import { isSearchV2 } from "@/search/lib/fts-query";
import { fuzzySearch, isSearchFuzzy } from "@/search/fuzzy";
import { isSearchLog, recordSearchEvent, type LogDb } from "@/search/log";
import { parseClick } from "@/search/lib/search-log";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSearchLog(process.env.SEARCH_LOG_ENABLED)) return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const deps = { db: () => getD1() as unknown as LogDb, now: () => Date.now(), enabled: true };
  if (body?.kind === "click") {
    const click = parseClick(body);
    if (!click) return NextResponse.json({ ok: false }, { status: 400 });
    return NextResponse.json({ ok: await recordSearchEvent(deps, click) });
  }
  if (body?.kind !== "search" || typeof body.q !== "string" || typeof body.language !== "string" || typeof body.results !== "number")
    return NextResponse.json({ ok: false }, { status: 400 });
  let corrected = false;
  if (isSearchV2(process.env.SEARCH_V2_ENABLED) && isSearchFuzzy(process.env.SEARCH_FUZZY_ENABLED)) {
    try { corrected = !!fuzzySearch(await loadCatalog(body.language), body.q, true)?.changes.length; } catch { /* sin catálogo: no corregida */ }
  }
  return NextResponse.json({ ok: await recordSearchEvent(deps, { kind: "search", language: body.language, query: body.q, results: body.results, corrected }) });
}
