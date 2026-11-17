/** REQ-10777: HTML del proveedor → líneas de texto limpias (una por párrafo o viñeta). Puro. */
const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&aacute;": "á", "&eacute;": "é", "&iacute;": "í", "&oacute;": "ó", "&uacute;": "ú", "&ntilde;": "ñ" };

// REQ-10777
export function decodeEntities(s: string): string {
  return s.replace(/&(?:nbsp|amp|lt|gt|quot|#39|aacute|eacute|iacute|oacute|uacute|ntilde);/g, (m) => ENTITIES[m] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Quita etiquetas y deja un solo espacio; sin saltos de línea. */
// REQ-10777
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Un renglón por `<p>`, `<li>` o `<br>`; vacíos fuera. Texto plano con saltos de línea también se parte. */
// REQ-10777
export function htmlToLines(html: string | null | undefined): string[] {
  if (!html) return [];
  return html
    .replace(/<\/(p|li|div|h\d)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .map((l) => htmlToText(l))
    .filter(Boolean);
}

/** Solo etiquetas seguras de formato (p, br, strong, em, ul, ol, li) sin atributos; lo demás se quita. */
// REQ-10777
export function sanitizeHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const out = html
    .replace(/<\s*(script|style|iframe)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\/?(?!\/?(p|br|strong|em|b|i|ul|ol|li)\b)[^>]*>/gi, "")
    .replace(/<(p|strong|em|b|i|ul|ol|li)\b[^>]*>/gi, "<$1>")
    .replace(/<br\b[^>]*>/gi, "<br>")
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .trim();
  return htmlToText(out) ? out : null;
}
