/** REQ-045: cuándo se muestra la burbuja flotante de WhatsApp. Puro. */
export const DESKTOP_MIN = 768;

export function bubbleVisible(s: { scrollY: number; width: number; revealAfter?: number }): boolean {
  if (!s.revealAfter || s.width >= DESKTOP_MIN) return true;
  return s.scrollY > s.revealAfter;
}
