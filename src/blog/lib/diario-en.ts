/**
 * REQ-3452 (gate B2, REQ-3339): reglas de la versión en inglés de una entrada del blog diario. Puro.
 * Misma estructura que la española (secciones, datos, tabla, fotos), los mismos enlaces internos y «How we know» con AI.
 */
import type { Post, PostEn } from "./schema";
import { wordCount } from "./schema";
import { inlineLinks, plainText } from "./inline";
import { termConflicts } from "./terms";

const EN_PROHIBIDAS = /FREETOUR|free\s*tour\.com/i;
const internal = (texts: string[]) => new Set(texts.flatMap((t) => inlineLinks(t)).map((l) => l.href.split(/[?#]/)[0].replace(/\/+$/, "") || "/").filter((h) => h.startsWith("/")));
const esTexts = (p: Post) => [p.enBreve, p.entrada, ...p.sections.flatMap((s) => [s.answer, ...s.body, ...(s.list ?? [])]), ...(p.datos ?? []).map((d) => d.text), ...(p.faq ?? []).map((f) => f.a)];
const enTexts = (e: PostEn) => [e.enBreve, e.entrada, ...e.sections.flatMap((s) => [s.answer, ...s.body, ...(s.list ?? [])]), ...(e.datos ?? []).map((d) => d.text), ...(e.faq ?? []).map((f) => f.a)];

// REQ-3452
export function dailyEnProblems(p: Post, existing: Post[]): string[] {
  const e = p.en;
  if (!e) return ["falta la versión en inglés (en)"];
  const out: string[] = [];
  const brief = wordCount(plainText(e.enBreve));
  if (brief < 40 || brief > 80) out.push(`inglés: «In short» debe tener de 40 a 80 palabras (tiene ${brief})`);
  if (e.sections.length !== p.sections.length) out.push(`inglés: debe tener las mismas ${p.sections.length} secciones que la versión en español (tiene ${e.sections.length})`);
  const datos = p.datos?.length ?? 0;
  if ((e.datos?.length ?? 0) !== datos) out.push(`inglés: debe traducir los ${datos} datos de la versión en español (tiene ${e.datos?.length ?? 0})`);
  if (p.visual) {
    const v = e.visual;
    const same = v && v.head.length === p.visual.head.length && v.rows.length === p.visual.rows.length && v.rows.every((r, i) => r.length === p.visual!.rows[i].length);
    if (!same) out.push("inglés: la tabla debe tener las mismas columnas y filas que la versión en español");
  }
  if ((p.faq?.length ?? 0) !== (e.faq?.length ?? 0)) out.push("inglés: debe traducir las mismas preguntas frecuentes");
  if (p.cover && !e.cover) out.push("inglés: falta el alt de la portada");
  const fotos = (p.imagenes ?? []).map((b) => b.fotos.length);
  const alts = (e.imagenes ?? []).map((b) => b.alts.length);
  if (fotos.length !== alts.length || fotos.some((n, i) => alts[i] !== n)) out.push("inglés: cada foto necesita su alt en inglés (mismos bloques y fotos)");
  if (!/(?<!\p{L})AI(?!\p{L})|artificial intelligence/iu.test(e.comoLoSabemos) || /interview|approved by|reviewed by/i.test(e.comoLoSabemos)) out.push("inglés: «How we know» debe decir que se usó AI y no afirmar entrevistas ni aprobaciones");
  for (const t of [e.title, e.summary, e.targetTerm, e.comoLoSabemos, e.cta.label, ...e.sections.map((s) => s.h2), ...enTexts(e)]) {
    const m = EN_PROHIBIDAS.exec(t);
    if (m) out.push(`inglés: vocabulario prohibido: «${m[0]}»`);
  }
  const es = internal(esTexts(p));
  for (const h of internal(enTexts(e))) if (!es.has(h)) out.push(`inglés: enlace que no está en la versión en español: ${h}`);
  const others = existing.filter((x) => x.slug !== p.slug && x.en).map((x) => ({ term: x.en!.targetTerm, label: `${x.slug} (en)` }));
  const conflicts = termConflicts(e.targetTerm, others);
  if (conflicts.length) out.push(`inglés: término repetido o casi igual: ${conflicts.join(", ")}`);
  return [...new Set(out)];
}
