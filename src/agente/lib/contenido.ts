// Puro · REQ-3347: búsqueda en blog, guías de destino y ayuda para el agente (Mila). Solo contenido publicado.
import type { Post } from "@/blog/lib/schema";
import type { CityGuide } from "@/destinations/lib/guia";
import type { FaqItem } from "@/help/lib/faq";
import { normalize, HELP_PATH } from "@/help/lib/faq";
import { postPath } from "@/blog/lib/registry";
import { cityPath } from "@/destinations/lib/routes";

type Sec = { h2: string; answer: string };
export interface FuentesContenido {
  posts: Pick<Post, "slug" | "pillar" | "title" | "targetTerm" | "summary" | "enBreve" | "sections" | "draft">[];
  guias: Pick<CityGuide, "pais" | "ciudad" | "nombre" | "titulo" | "targetTerm" | "enBreve" | "sections">[];
  faq: FaqItem[];
}
export interface ResultadoContenido { tipo: "blog" | "guia" | "ayuda"; titulo: string; resumen: string; respuestas: string[]; enlace: string }

const VACIAS = new Set("que como cual cuales donde cuando para por con sin los las del una uno unos unas mis tus sus mas hay tiene tienen quiero saber".split(" "));
const palabras = (q: string) => normalize(q).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));
// Coincide la palabra o su raíz (pagar ~ pago, viajes ~ viaje).
const raiz = (w: string) => (w.length > 5 ? w.slice(0, w.length - 2) : w.length > 4 ? w.slice(0, w.length - 1) : w);
function puntaje(q: string[], texto: string): number {
  const t = normalize(texto);
  return q.filter((w) => t.includes(raiz(w))).length;
}
const respuestas = (s: Sec[]) => s.slice(0, 6).map((x) => `${x.h2} ${x.answer}`);

// REQ-3347
export function buscarContenido(q: string, f: FuentesContenido, base: string, limite = 4): ResultadoContenido[] {
  const w = palabras(q);
  if (!w.length) return [];
  const abs = (p: string) => `${base.replace(/\/$/, "")}${p}`;
  const c: (ResultadoContenido & { p: number })[] = [
    ...f.posts.filter((p) => !p.draft).map((p) => ({ tipo: "blog" as const, titulo: p.title, resumen: p.enBreve || p.summary, respuestas: respuestas(p.sections as Sec[]), enlace: abs(postPath(p)),
      p: puntaje(w, [p.title, p.targetTerm, p.summary, p.enBreve, ...(p.sections as Sec[]).map((s) => `${s.h2} ${s.answer}`)].join(" ")) })),
    ...f.guias.map((g) => ({ tipo: "guia" as const, titulo: g.titulo, resumen: g.enBreve, respuestas: respuestas(g.sections as Sec[]), enlace: abs(cityPath(g.pais, g.ciudad)),
      p: puntaje(w, [g.nombre, g.titulo, g.targetTerm, g.enBreve, ...(g.sections as Sec[]).map((s) => `${s.h2} ${s.answer}`)].join(" ")) })),
    ...f.faq.map((i) => ({ tipo: "ayuda" as const, titulo: i.q, resumen: i.a, respuestas: [], enlace: abs(i.link?.href ?? HELP_PATH), p: puntaje(w, `${i.q} ${i.a} ${i.tags ?? ""}`) })),
  ];
  return c.filter((x) => x.p >= 1).sort((a, b) => b.p - a.p).slice(0, limite).map(({ p: _p, ...r }) => r);
}
