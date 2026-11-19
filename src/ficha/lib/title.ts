/**
 * REQ-10810 · Ficha única, ola 7, bloque 3 «Título, calificación y marca» (plan §3). La marca que vende es Travel
 * Puzzle: el bloque nunca nombra al proveedor ni al operador. La nota de Tangol no se muestra (decisión 18, REQ-10652):
 * el adaptador la entrega en `null` y aquí, además, se vuelve a aplicar la regla por proveedor. «Favorito» solo con
 * 4.9 y 180 reseñas (decisión 16), calculado otra vez aquí aunque el modelo diga `favorite`. Textos ya en el idioma
 * del modelo y número con `toFixed` (sin `Intl` en el cliente, INC-001). Puro.
 */
import type { FichaLang, FichaRating } from "./model";
import { showsProviderRating } from "./rating-visibility";
import { isTravelerFavorite } from "@/reviews/lib/highlights";
import { translations } from "@/lib/translations";

export interface TitleInput { title: string; rating: FichaRating | null; provider: string; lang: FichaLang }
export interface TitleView {
  title: string;
  /** null = no se pinta ninguna estrella ni conteo. */
  rating: { value: string; reviews: string } | null;
  /** Texto de «Favorito de los viajeros» o null. */
  favorite: string | null;
}

// REQ-10810
export function titleView({ title, rating, provider, lang }: TitleInput): TitleView {
  const t = translations[lang] ?? translations.es;
  const visible = showsProviderRating(provider) && rating !== null && rating.value !== null && rating.value > 0 && rating.count > 0;
  if (!visible) return { title, rating: null, favorite: null };
  const value = rating.value as number;
  return {
    title,
    rating: { value: value.toFixed(1), reviews: (t["reviews.count"] ?? "{count}").replace("{count}", String(rating.count)) },
    favorite: rating.favorite && isTravelerFavorite(value, rating.count) ? t["tours.favorite"] ?? null : null,
  };
}
