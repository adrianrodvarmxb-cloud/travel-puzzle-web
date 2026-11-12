// Puro · REQ-1293 (P5 = A): primero los publicados; los nuevos en tandas de 20 al día.
export interface Candidato { id: string; publicado: boolean; etapa: string; bloqueado?: boolean }

export const TANDA_DIARIA = 20;

// REQ-1293
export function tandaDelDia(lista: Candidato[], cupo = TANDA_DIARIA): string[] {
  return lista
    .filter((p) => p.etapa === "por_contactar" && !p.bloqueado)
    .sort((a, b) => Number(b.publicado) - Number(a.publicado) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, cupo))
    .map((p) => p.id);
}
