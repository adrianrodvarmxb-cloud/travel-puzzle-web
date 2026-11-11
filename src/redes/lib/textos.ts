/**
 * Redes del día: el mismo tema de la entrada del blog, adaptado a LinkedIn, Facebook e Instagram. Puro.
 * Pedido del PO (7 nov 2026, 04:28): «que todos los días publique también en LinkedIn, Facebook e IG el mismo tema,
 * pero adaptado a cada red social». Mismas reglas del blog: solo lo que el artículo dice con fuente, sin «FREETOUR»
 * (cumplimiento B3: anunciar free tours sí; nombre o logo del proveedor, no). REQ-1070…1074, REQ-1084.
 */
import type { Post } from "@/blog/lib/schema";
import { inlineLinks, plainText } from "@/blog/lib/inline";
import { postPath } from "@/blog/lib/registry";
import { pillarBySlug } from "@/blog/lib/pillars";
import { PROHIBIDAS_DIARIO } from "@/blog/lib/diario";
import { PROHIBIDAS_SITIO } from "@/site/lib/vocab";

export type Red = "linkedin" | "facebook" | "instagram";
export const LIMITS = { linkedin: { min: 1200, max: 1800 }, facebook: { min: 400, max: 800 }, instagram: { min: 1, max: 2200 } } as const;
export const IG_TAGS = { min: 10, max: 15 } as const;
export const LI_TAGS = { min: 3, max: 5 } as const;
export const LAMINAS = { min: 3, max: 5 } as const;
const LAMINA_MAX = 170;

/** REQ-1072/1084: hashtags por pilar (sin nombres de proveedores; «free tour» no se usa como hashtag de marca). */
const BASE = ["#TravelPuzzle", "#TeArmamosTuViaje", "#ViajerosMexicanos", "#ViajarDesdeMexico", "#Viajes", "#Turismo", "#TipsDeViaje", "#Vacaciones"];
export const HASHTAGS = {
  europa: ["#Europa", "#ViajarAEuropa", "#EspacioSchengen", "#EuropaDesdeMexico", "#Eurotrip"],
  china: ["#China", "#ViajarAChina", "#Asia", "#Pekin", "#Shanghai"],
  peru: ["#Peru", "#MachuPicchu", "#ViajarAPeru", "#Cusco", "#Lima"],
  colombia: ["#Colombia", "#ViajarAColombia", "#Bogota", "#Cartagena", "#Medellin"],
  mexico: ["#CDMX", "#CiudadDeMexico", "#QueHacerEnCDMX", "#Mexico", "#ToursAPie"],
  "free-tours": ["#ToursAPie", "#ViajarBarato", "#Europa", "#CDMX", "#Viajes"],
} as const;
const tagsFor = (p: Post) => HASHTAGS[(p.pillar in HASHTAGS ? p.pillar : "europa") as keyof typeof HASHTAGS];

// REQ-1070/1071
export function utmUrl(url: string, red: Red): string {
  return `${url}${url.includes("?") ? "&" : "?"}utm_source=${red}&utm_medium=social&utm_campaign=blog`;
}

const firstSentence = (s: string) => (/^(.+?[.!?])(\s|$)/.exec(s)?.[1] ?? s).trim();
const external = (text: string) => inlineLinks(text).filter((l) => l.href.startsWith("https://"));
const words = (s: string) => new Set(s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").split(/[^a-z0-9]+/).filter((w) => w.length > 3));
const overlap = (a: string, b: string) => { const A = words(a); const B = words(b); const i = [...A].filter((w) => B.has(w)).length; return i / Math.max(1, Math.min(A.size, B.size)); };

const LAMINA_MIN = 40;

/**
 * Respuestas de los H2 que traen fuente externa, en texto plano. Para viñetas, «pregunta + primera frase»; para
 * láminas, la respuesta completa si cabe (si no, su primera frase), nunca menos de 40 caracteres.
 */
function sourcedAnswers(p: Post, max: number, withQuestion = false): { texto: string; fuente: string; pregunta: string }[] {
  return p.sections.flatMap((s) => {
    const ext = external(s.answer);
    if (!ext.length) return [];
    const full = plainText(s.answer);
    const texto = withQuestion ? `${s.h2} ${firstSentence(full)}` : full.length <= max ? full : firstSentence(full);
    return texto.length <= max && texto.length >= LAMINA_MIN ? [{ texto, fuente: ext[0].text, pregunta: s.h2 }] : [];
  });
}

export type Foto = { imagen: string; credito: string };
// REQ-1516: cada lámina lleva su foto (a sangre completa en la lámina).
export type Lamina = Foto & ({ tipo: "portada"; titulo: string; pilar: string } | { tipo: "dato"; texto: string; fuente: string; pregunta?: string; n: number; de: number });

// REQ-1073: portada + 3 o 4 datos clave con su fuente (primero `datos`, luego respuestas con fuente, sin repetir).
// REQ-1516: las fotos de la entrada (portada, luego las de `imagenes`) se reparten en orden; sin fotos, no hay láminas.
export function laminasFor(p: Post): Lamina[] {
  const fotos: Foto[] = [
    ...(p.cover ? [{ imagen: p.cover.src, credito: p.cover.credit }] : []),
    ...(p.imagenes ?? []).flatMap((b) => b.fotos.map((f) => ({ imagen: f.src, credito: f.credit }))),
  ];
  if (!fotos.length) return [];
  const pool: { texto: string; fuente: string; pregunta?: string }[] = [...(p.datos ?? []).map((d) => ({ texto: plainText(d.text), fuente: d.source.label })), ...sourcedAnswers(p, LAMINA_MAX)];
  const picked: typeof pool = [];
  for (const c of pool) {
    if (c.texto.length > LAMINA_MAX || picked.some((x) => overlap(x.texto, c.texto) >= 0.5)) continue;
    picked.push(c);
    if (picked.length === LAMINAS.max - 1) break;
  }
  const de = picked.length;
  const foto = (k: number): Foto => fotos[k % fotos.length];
  return [
    ...(p.cover ? [{ tipo: "portada" as const, titulo: p.title, pilar: pillarBySlug(p.pillar)?.name ?? p.pillar, ...foto(0) }] : []),
    ...picked.map((d, i) => ({ tipo: "dato" as const, texto: d.texto, fuente: d.fuente, ...(d.pregunta ? { pregunta: d.pregunta } : {}), n: i + 1, de, ...foto((p.cover ? 1 : 0) + i) })),
  ];
}

export interface SocialPack { linkedin: string; facebook: string; instagram: { caption: string; laminas: Lamina[] } }

function linkedin(p: Post, url: string): string {
  const breve = plainText(p.enBreve);
  const bullets = sourcedAnswers(p, 300, true).map((b) => `• ${b.texto}`);
  const tags = ["#TravelPuzzle", "#Viajes", ...tagsFor(p).slice(0, 2)].join(" ");
  const build = (n: number, extra: boolean) => [
    p.title, "", breve, ...(extra ? ["", plainText(p.entrada).replace(/\s*Es parte de la guía[^.]*\.?$/, "")] : []), "", "Lo que conviene saber:", ...bullets.slice(0, n), "",
    `La guía completa, con todas las fuentes: ${utmUrl(url, "linkedin")}`, "", tags,
  ].join("\n");
  for (const extra of [false, true]) {
    for (let n = Math.min(5, bullets.length); n >= 3; n--) {
      const t = build(n, extra);
      if (t.length <= LIMITS.linkedin.max && t.length >= LIMITS.linkedin.min) return t;
    }
  }
  return build(Math.min(5, bullets.length), false);
}

function facebook(p: Post, url: string): string {
  const sentences = plainText(p.enBreve).match(/[^.!?]+[.!?]+/g) ?? [plainText(p.enBreve)];
  const tail = `¿Ya tienes fechas? Aquí te contamos qué cambió y qué sigue igual, con sus fuentes: ${utmUrl(url, "facebook")}`;
  let body = sentences.join("").trim();
  while (`${p.title}\n\n${body}\n\n${tail}`.length > LIMITS.facebook.max && sentences.length > 1) { sentences.pop(); body = sentences.join("").trim(); }
  return `${p.title}\n\n${body}\n\n${tail}`;
}

function instagram(p: Post): string {
  const bullets = sourcedAnswers(p, 300, true).slice(0, 3).map((b) => `• ${b.texto}`);
  const tags = [...BASE, ...tagsFor(p)].slice(0, 13).join(" ");
  return [p.title, "", plainText(p.enBreve), "", "Lo esencial:", ...bullets, "", "La guía completa, con todas las fuentes, está en el link en bio.", "", tags].join("\n");
}

// REQ-1070…1073
export function socialPack(p: Post, siteUrl: string): SocialPack {
  const url = `${siteUrl.replace(/\/+$/, "")}${postPath(p)}`;
  return { linkedin: linkedin(p, url), facebook: facebook(p, url), instagram: { caption: instagram(p), laminas: laminasFor(p) } };
}

/** Cifras que el artículo respalda: las que aparecen en una unidad de texto con fuente externa, en `datos` o en una tabla con fuente. */
function sourcedNumbers(p: Post): Set<string> {
  const units = [p.enBreve, p.entrada, ...p.sections.flatMap((s) => [s.answer, ...s.body, ...(s.list ?? [])]), ...(p.faq ?? []).map((f) => f.a)];
  const texts = [
    ...units.filter((u) => external(u).length).map(plainText),
    ...(p.datos ?? []).map((d) => d.text),
    ...(p.visual?.source ? p.visual.rows.flat() : []),
  ];
  return new Set(texts.flatMap((t) => t.match(/\d+(?:[.,]\d+)*/g) ?? []));
}

// REQ-1074 + REQ-1084: las mismas reglas del blog sobre los textos de redes
export function socialProblems(pack: SocialPack, p: Post, siteUrl: string): string[] {
  const out: string[] = [];
  const url = `${siteUrl.replace(/\/+$/, "")}${postPath(p)}`;
  const nums = sourcedNumbers(p);
  const laminaTexts = pack.instagram.laminas.map((l) => (l.tipo === "portada" ? `${l.titulo} ${l.pilar}` : `${l.pregunta ?? ""} ${l.texto} ${l.fuente}`));
  const check = (red: Red, text: string) => {
    const m = PROHIBIDAS_SITIO.exec(text);
    if (m) out.push(`${red}: vocabulario prohibido «${m[0]}»`);
    const d = PROHIBIDAS_DIARIO.exec(text);
    if (d) out.push(`${red}: vocabulario del blog diario «${d[0]}»`);
    const withoutUrls = text.replace(/https?:\/\/\S+/g, " ").replace(/#\S+/g, " ");
    for (const n of withoutUrls.match(/\d+(?:[.,]\d+)*/g) ?? []) if (!nums.has(n)) out.push(`${red}: la cifra «${n}» no está con fuente en el artículo`);
  };
  const tags = (t: string) => t.match(/#\p{L}[\p{L}\d]*/gu) ?? [];
  // LinkedIn
  check("linkedin", pack.linkedin);
  if (pack.linkedin.length < LIMITS.linkedin.min || pack.linkedin.length > LIMITS.linkedin.max) out.push(`linkedin: debe tener de ${LIMITS.linkedin.min} a ${LIMITS.linkedin.max} caracteres (tiene ${pack.linkedin.length})`);
  const liBullets = pack.linkedin.split("\n").filter((l) => l.startsWith("• ")).length;
  if (liBullets < 3 || liBullets > 5) out.push(`linkedin: lleva de 3 a 5 viñetas (tiene ${liBullets})`);
  if (!pack.linkedin.includes(utmUrl(url, "linkedin"))) out.push("linkedin: falta el enlace con UTM de linkedin");
  const liTags = tags(pack.linkedin).length;
  if (liTags < LI_TAGS.min || liTags > LI_TAGS.max) out.push(`linkedin: lleva de ${LI_TAGS.min} a ${LI_TAGS.max} hashtags (tiene ${liTags})`);
  // Facebook
  check("facebook", pack.facebook);
  if (pack.facebook.length < LIMITS.facebook.min || pack.facebook.length > LIMITS.facebook.max) out.push(`facebook: debe tener de ${LIMITS.facebook.min} a ${LIMITS.facebook.max} caracteres (tiene ${pack.facebook.length})`);
  if (!pack.facebook.includes(utmUrl(url, "facebook"))) out.push("facebook: falta el enlace con UTM de facebook");
  // Instagram
  const ig = pack.instagram;
  check("instagram", [ig.caption, ...laminaTexts].join("\n"));
  if (ig.caption.length > LIMITS.instagram.max) out.push(`instagram: más de ${LIMITS.instagram.max} caracteres (tiene ${ig.caption.length})`);
  if (!/link en bio/i.test(ig.caption)) out.push("instagram: falta «link en bio»");
  if (/https?:\/\//.test(ig.caption)) out.push("instagram: el caption no lleva URL (no es clicable)");
  const igTags = tags(ig.caption);
  if (igTags.length < IG_TAGS.min || igTags.length > IG_TAGS.max) out.push(`instagram: lleva de ${IG_TAGS.min} a ${IG_TAGS.max} hashtags (tiene ${igTags.length})`);
  if (ig.laminas.length < LAMINAS.min || ig.laminas.length > LAMINAS.max) out.push(`instagram: el carrusel lleva de ${LAMINAS.min} a ${LAMINAS.max} láminas (tiene ${ig.laminas.length})`);
  if (ig.laminas[0]?.tipo !== "portada") out.push("instagram: la primera lámina es la portada del artículo");
  return [...new Set(out)];
}
