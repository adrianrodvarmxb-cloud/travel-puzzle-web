/**
 * Reseñas que nombran la plataforma (decisión del PO, 6 nov 2026; FREETOUR no se menciona al cliente).
 * Se filtran al pintar; en la base no se tocan y el conteo y la calificación del proveedor no cambian. Pura.
 * Solo cuenta el nombre pegado («freetour», «freetours») o el dominio («freetour.com», «free tour .com»);
 * «free tour» como categoría genérica no.
 */
const PLATFORM = /freetours?|free[\s-]*tours?\s*\.\s*com/;

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// REQ-171
export function mentionsPlatform(text: string | null | undefined): boolean {
  return !!text && PLATFORM.test(normalize(text));
}

// REQ-171
export function withoutPlatformMentions<T extends { title: string | null; content: string }>(reviews: readonly T[]): T[] {
  return reviews.filter((r) => !mentionsPlatform(r.title) && !mentionsPlatform(r.content));
}
