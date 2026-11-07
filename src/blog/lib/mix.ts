/**
 * REQ-962, REQ-983: mezcla 80/20 del blog diario y plan del día. Puro (fechas como texto AAAA-MM-DD; sin reloj).
 * Ventana móvil de 10 días que termina en la fecha de la entrada: máximo 8 de pago y 2 de free, una por día.
 * Se mide en días y no en entradas: un día sin publicar (p. ej. free tour bloqueado por B1) no rompe la cuenta.
 */
import type { CalendarItem } from "../content/calendario";

export type Mix = "pago" | "free";
export const MIX_WINDOW_DAYS = 10;
export const MIX_MAX: Record<Mix, number> = { pago: 8, free: 2 };

/**
 * REQ-983: regla B1 de FREETOUR (§7.1, pregunta 7 de docs/freetour/autorizaciones.md). Promover free tours requiere
 * aprobación por escrito. Pasa a `true` solo en un PR que agregue esa respuesta al registro de autorizaciones.
 */
export const FREE_TOUR_POSTS_B1 = false;

export interface MixPost { publishedAt: string; mix?: Mix; draft: boolean; clusterId?: string; targetTerm?: string }

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const counted = (p: MixPost) => !p.draft && !!p.mix;

// REQ-962
export function mixWindow(posts: MixPost[], date: string): Record<Mix, number> {
  const from = addDays(date, -(MIX_WINDOW_DAYS - 1));
  const inWin = posts.filter((p) => counted(p) && p.publishedAt >= from && p.publishedAt <= date);
  return { pago: inWin.filter((p) => p.mix === "pago").length, free: inWin.filter((p) => p.mix === "free").length };
}

// REQ-962
export function mixProblems(candidate: { publishedAt: string; mix: Mix }, published: MixPost[]): string[] {
  if (published.some((p) => !p.draft && p.publishedAt === candidate.publishedAt)) return [`ya hay una entrada publicada el ${candidate.publishedAt}`];
  const w = mixWindow(published, candidate.publishedAt);
  if (w[candidate.mix] + 1 > MIX_MAX[candidate.mix]) {
    return [`mezcla 80/20: ya hay ${w[candidate.mix]} entradas de ${candidate.mix} en los ${MIX_WINDOW_DAYS} días que terminan el ${candidate.publishedAt}`];
  }
  return [];
}

export interface Plan { kind: Mix | "ninguno"; item: CalendarItem | null; motivo: string }

// REQ-962, REQ-983: qué toca hoy. Sigue el orden del calendario; con B1 bloqueado salta los free tours.
export function planDelDia(o: { posts: MixPost[]; calendar: CalendarItem[]; today: string; b1: boolean }): Plan {
  if (o.posts.some((p) => !p.draft && p.publishedAt === o.today)) return { kind: "ninguno", item: null, motivo: `ya hay una entrada publicada el ${o.today}` };
  const usedIds = new Set(o.posts.map((p) => p.clusterId).filter(Boolean));
  const usedTerms = new Set(o.posts.map((p) => (p.targetTerm ?? "").trim().toLowerCase()));
  const pending = o.calendar.filter((c) => !usedIds.has(c.id) && !usedTerms.has(c.term.toLowerCase()));
  const w = mixWindow(o.posts, o.today);
  const fits = (m: Mix) => w[m] + 1 <= MIX_MAX[m] && (m === "pago" || o.b1);
  const order = o.b1 ? pending : pending.filter((c) => c.mix === "pago");
  const pick = order.find((c) => c.mix === order[0]?.mix && fits(c.mix)) ?? order.find((c) => fits(c.mix));
  if (pick) return { kind: pick.mix, item: pick, motivo: `siguiente pendiente del calendario (${pick.id})` };
  if (!o.b1 && w.pago >= MIX_MAX.pago) return { kind: "ninguno", item: null, motivo: "hoy toca free tour y B1 sigue sin autorización por escrito: no se publica" };
  return { kind: "ninguno", item: null, motivo: pending.length ? "la mezcla 80/20 no deja publicar hoy" : "calendario agotado: hace falta la versión siguiente" };
}
