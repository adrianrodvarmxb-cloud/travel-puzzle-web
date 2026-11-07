/** REQ-255: «En esta página» con 4 o más H2; ids sin acentos ni signos. Puro. */
export const TOC_MIN_H2 = 4;

export function headingId(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function tocFor(h2s: string[]): { id: string; label: string }[] {
  return h2s.length >= TOC_MIN_H2 ? h2s.map((label) => ({ id: headingId(label), label })) : [];
}
