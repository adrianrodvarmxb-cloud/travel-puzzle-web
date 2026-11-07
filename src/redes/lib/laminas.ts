/**
 * REQ-1073: láminas de Instagram 1080×1350 en diseño de marca (colores del blog). Puro: arma el SVG; el script
 * src/scripts/redes-laminas.ts lo pinta con sharp y pone la foto de la portada en la parte de arriba.
 * Nada encima de la foto salvo el velo: el título va en una franja de marca debajo.
 */
import type { Lamina } from "./textos";

export const LAMINA_W = 1080;
export const LAMINA_H = 1350;
export const PHOTO_H = 760;
const NAVY = "#0A1330";
const LIME = "#EAF54F";
const BLUE = "#008DFF";
const SOFT = "#C9D6F5";
const MUTED = "#A9B6D6";
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Parte el texto en líneas de máximo `max` caracteres (sin cortar palabras). */
export function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && `${cur} ${w}`.length > max) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

const lines = (t: string[], x: number, y: number, size: number, lh: number, attrs: string) =>
  t.map((l, i) => `<text x="${x}" y="${y + i * lh}" font-size="${size}" ${attrs}>${esc(l)}</text>`).join("");

const footer = () =>
  `<rect x="60" y="1262" width="56" height="6" fill="${LIME}"/>` +
  `<text x="60" y="1306" font-size="30" font-weight="700" fill="#FFFFFF" font-family="${FONT}">Travel Puzzle</text>` +
  `<text x="1020" y="1306" font-size="26" text-anchor="end" fill="${MUTED}" font-family="${FONT}">travelpuzzle.com.mx · Te armamos tu viaje</text>`;

// REQ-1073
export function laminaSvg(l: Lamina): string {
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${LAMINA_W}" height="${LAMINA_H}" viewBox="0 0 ${LAMINA_W} ${LAMINA_H}">`;
  if (l.tipo === "portada") {
    const title = wrapText(l.titulo, 26).slice(0, 4);
    return head +
      // velo de marca sobre la parte baja de la foto (la foto la compone sharp debajo de este SVG)
      `<defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="${NAVY}" stop-opacity="0"/><stop offset="1" stop-color="${NAVY}" stop-opacity="0.85"/></linearGradient></defs>` +
      `<rect x="0" y="0" width="${LAMINA_W}" height="${PHOTO_H}" fill="url(#v)"/>` +
      `<rect x="0" y="${PHOTO_H}" width="${LAMINA_W}" height="${LAMINA_H - PHOTO_H}" fill="${NAVY}"/>` +
      lines([l.pilar.toUpperCase()], 60, PHOTO_H + 70, 26, 0, `letter-spacing="6" fill="${LIME}" font-family="${FONT}"`) +
      lines(title, 60, PHOTO_H + 140, 54, 66, `font-weight="700" fill="#FFFFFF" font-family="${FONT}"`) +
      lines([l.credito], 60, PHOTO_H + 140 + title.length * 66 + 10, 22, 0, `fill="${MUTED}" font-family="${FONT}"`) +
      footer() + "</svg>";
  }
  const q = l.pregunta ? wrapText(l.pregunta, 38).slice(0, 3) : [];
  const body = wrapText(l.texto, 28).slice(0, 8);
  const qY = 300;
  const bY = qY + (q.length ? q.length * 48 + 50 : 0);
  return head +
    `<rect x="0" y="0" width="${LAMINA_W}" height="${LAMINA_H}" fill="${NAVY}"/>` +
    `<rect x="0" y="0" width="${LAMINA_W}" height="12" fill="${BLUE}"/>` +
    lines([`DATO ${l.n} DE ${l.de}`], 60, 190, 30, 0, `letter-spacing="8" font-weight="700" fill="${LIME}" font-family="${FONT}"`) +
    lines(q, 60, qY, 38, 48, `fill="${SOFT}" font-family="${FONT}"`) +
    lines(body, 60, bY, 56, 70, `font-weight="700" fill="#FFFFFF" font-family="${FONT}"`) +
    lines(wrapText(`Fuente: ${l.fuente}`, 52).slice(0, 2), 60, Math.min(bY + body.length * 70 + 50, 1180), 28, 36, `fill="${MUTED}" font-family="${FONT}"`) +
    footer() + "</svg>";
}

/** Archivo y URL pública de cada lámina (se publica junto con la entrada, en su carpeta de imágenes). */
export const laminaFile = (slug: string, n: number) => `public/blog/img/${slug}/ig-${n}.jpg`;
export const laminaUrl = (slug: string, n: number, siteUrl: string) => `${siteUrl.replace(/\/+$/, "")}/blog/img/${slug}/ig-${n}.jpg`;
