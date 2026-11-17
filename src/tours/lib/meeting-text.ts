/**
 * REQ-10783: Tangol manda el punto de encuentro y los datos prácticos en HTML (`<p>`, `<ul>`, `<span style>`); la
 * ficha los pintaba tal cual (hallazgo del 17-11-2026 en /destinos/ar/el-calafate/glaciar-perito-moreno). Aquí se
 * convierte a texto antes de que llegue a cualquier componente. Puro.
 */
import { htmlToLines, htmlToText } from "@/ficha/lib/text";

const HAS_TAG = /<[a-z][\s\S]*>|&(?:nbsp|amp|lt|gt|quot|#\d+);/i;

/** Texto plano de una línea (título del punto de encuentro); lo que no trae HTML pasa igual. */
// REQ-10783
export function plainTitle(s: string | null | undefined): string | null {
  if (typeof s !== "string") return s ?? null;
  return HAS_TAG.test(s) ? htmlToText(s) : s;
}

/** Texto de varias líneas (qué llevar, notas): un renglón por párrafo o viñeta. */
// REQ-10783
export function plainLines(s: string | null | undefined): string | null {
  if (typeof s !== "string") return s ?? null;
  return HAS_TAG.test(s) ? htmlToLines(s).join("\n") : s;
}

/** El punto de encuentro de la fila con su título en texto plano (lo demás igual). */
// REQ-10783
export function cleanMeetingPoint<T extends { title?: string | null } | null | undefined>(mp: T): T {
  if (!mp || typeof mp !== "object") return mp;
  return { ...mp, title: plainTitle(mp.title) } as T;
}
