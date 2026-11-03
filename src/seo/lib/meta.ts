/** Título, descripción e imagen para la vista previa al compartir (WhatsApp, Facebook, etc.). */
import { formatRating } from "@/home/lib/format";

export const SITE_META = {
  name: "Travel Puzzle",
  title: "Travel Puzzle · Te armamos tu viaje",
  description: "Tours con guías locales en todo el mundo y un asesor en español que te acompaña por WhatsApp.",
  // Nombre nuevo para que WhatsApp y Facebook no muestren la imagen anterior en caché.
  image: "/og-2.jpg",
};

/** Corta el texto en un límite sin romper palabras. */
export function clip(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–]+$/, "")}…`;
}

const REVIEWS: Record<string, string> = { es: "reseñas", en: "reviews", pt: "avaliações", de: "Bewertungen", fr: "avis", it: "recensioni" };

export function tourMeta(
  t: { title: string; brief: string | null; rating: number | string | null; reviews: number; image: string | null },
  lang: string
) {
  const rating = formatRating(t.rating);
  const title = rating && t.reviews > 0 ? `${t.title} · ★ ${rating} (${t.reviews.toLocaleString("en-US")} ${REVIEWS[lang] ?? REVIEWS.en})` : t.title;
  return {
    title,
    description: t.brief?.trim() ? clip(t.brief) : SITE_META.description,
    image: t.image?.startsWith("https://") ? t.image : SITE_META.image,
  };
}
