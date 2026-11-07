import { NextResponse } from "next/server";
import { parseCarouselQuery } from "@/home/lib/carousel-pages";
import { loadCarouselPageCards } from "@/home/carousel-load";

/** REQ-851, REQ-856: páginas siguientes de «Los más elegidos» y «Excursiones de un día» (el inicio pinta la primera). */
export async function GET(req: Request) {
  const q = parseCarouselQuery(new URL(req.url).searchParams);
  if (!q) return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
  try {
    const body = await loadCarouselPageCards(q);
    return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" } });
  } catch (e) {
    console.error("[home] carrusel sin datos:", (e as Error).message);
    return NextResponse.json({ cards: [], hasMore: false }, { status: 200 });
  }
}
