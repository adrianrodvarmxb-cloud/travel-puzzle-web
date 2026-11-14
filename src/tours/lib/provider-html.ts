/**
 * Texto que escribe el proveedor (Tangol manda resumen y descripción en HTML con estilos propios).
 * Puro y determinista (INC-001): sin DOM, sirve igual en el servidor y en el cliente.
 * - REQ-10544: el resumen va como texto plano (antes se pintaban las etiquetas como texto).
 * - REQ-10545: la descripción va con una lista corta de etiquetas y SIN atributos: sin estilos que pinten
 *   un recuadro blanco, sin enlaces al proveedor (cláusula 7.2) y sin nada ejecutable.
 */
const DANGEROUS = /<(script|style|iframe|object|embed|noscript|template|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>|<(script|style|iframe|object|embed)\b[^>]*\/?>/gi;
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4"]);
const ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi;
const NAMED: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string): string {
  return s.replace(ENTITY, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Escapa un tramo de texto conservando las entidades válidas que ya trae. */
function escapeText(s: string): string {
  return s.replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// REQ-10544
export function plainText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = decode(html.replace(DANGEROUS, " ").replace(TAG, " ")).replace(/\s+/g, " ").trim();
  return text || null;
}

// REQ-10545
export function safeDescriptionHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const sinPeligro = html.replace(DANGEROUS, "");
  if (!new RegExp(TAG.source).test(sinPeligro)) {
    const t = escapeText(sinPeligro.trim()).replace(/\r?\n/g, "<br>");
    return t || null;
  }
  let out = "";
  let last = 0;
  for (const m of sinPeligro.matchAll(TAG)) {
    out += escapeText(sinPeligro.slice(last, m.index));
    last = m.index! + m[0].length;
    const name = m[1].toLowerCase();
    if (!ALLOWED.has(name)) continue;
    out += name === "br" ? "<br>" : m[0][1] === "/" ? `</${name}>` : `<${name}>`;
  }
  out += escapeText(sinPeligro.slice(last));
  out = out.trim();
  return plainText(out) ? out : null;
}
