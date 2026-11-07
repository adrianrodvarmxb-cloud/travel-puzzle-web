/**
 * REQ-255: mini-formato del texto del blog: [texto](/ruta o https://…) y **negrita**. Puro.
 * Nunca se pinta HTML crudo: lo demás queda como texto. Solo enlaces internos o https.
 */
export type InlineNode = { t: "text"; v: string } | { t: "bold"; v: string } | { t: "link"; v: string; href: string };

const TOKEN = /\[([^\]]+)\]\(((?:\/|https:\/\/)[^\s)]*)\)|\*\*([^*]+)\*\*/g;

export function parseInline(src: string): InlineNode[] {
  const out: InlineNode[] = [];
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    if (m.index! > last) out.push({ t: "text", v: src.slice(last, m.index) });
    out.push(m[1] !== undefined ? { t: "link", v: m[1], href: m[2] } : { t: "bold", v: m[3] });
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push({ t: "text", v: src.slice(last) });
  return out;
}

export function inlineLinks(src: string): { text: string; href: string }[] {
  return parseInline(src).flatMap((n) => (n.t === "link" ? [{ text: n.v, href: n.href }] : []));
}

export function plainText(src: string): string {
  return parseInline(src).map((n) => n.v).join("");
}
