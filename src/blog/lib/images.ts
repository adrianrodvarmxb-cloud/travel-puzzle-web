/**
 * Imágenes del blog (skill blog-metodo-referentes, §Diseño premium e §Imágenes con formato). Puro.
 * REQ-1053: AVIF/WebP/JPG a 800 y 1600 px servidos desde el sitio; REQ-1054: proporción por formato;
 * REQ-1051/1052: reglas del validador del diario (portada + 2 a 4 fotos, licencia por banco, sin FREETOUR).
 */
import type { BlogImage, Post } from "./schema";

export const IMAGE_WIDTHS = [800, 1600] as const;
export const IMAGE_FORMATS = ["avif", "webp", "jpg"] as const;
export const BODY_PHOTOS = { min: 2, max: 4 } as const;
export const LOCAL_IMG = /^\/blog\/img\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * REQ-1052: proveedores con permiso escrito para usar sus fotos en el blog (C2/C5: nunca FREETOUR).
 * Extime entra aquí, con crédito «© Extime Travel», solo cuando su autorización quede por escrito.
 */
export const PROVEEDORES_FOTOS_CON_PERMISO: string[] = [];

const LICENSE_BY_BANK = { unsplash: "Unsplash License", pexels: "Pexels License", pixabay: "Pixabay Content License", proveedor: "Permiso del proveedor" } as const;
const BANK_LABEL = { unsplash: "Unsplash", pexels: "Pexels", pixabay: "Pixabay", proveedor: "" } as const;
const PAGE_HOST = { unsplash: /(^|\.)unsplash\.com$/, pexels: /(^|\.)pexels\.com$/, pixabay: /(^|\.)pixabay\.com$/, proveedor: /./ } as const;
const DOWNLOAD_HOST = { unsplash: /^images\.unsplash\.com$/, pexels: /^images\.pexels\.com$/, pixabay: /^(cdn\.)?pixabay\.com$/, proveedor: /./ } as const;

export type Variants = { local: true; avif: string; webp: string; jpg: string; fallback: string } | { local: false; fallback: string };

// REQ-1053
export function imageVariants(src: string): Variants {
  if (!LOCAL_IMG.test(src)) return { local: false, fallback: src };
  const set = (f: string) => IMAGE_WIDTHS.map((w) => `${src}-${w}.${f} ${w}w`).join(", ");
  return { local: true, avif: set("avif"), webp: set("webp"), jpg: set("jpg"), fallback: `${src}-1600.jpg` };
}

/** REQ-1053/1058: URL absoluta en JPG (JSON-LD, Open Graph, redes). */
export function imageUrl(src: string, siteUrl: string, width: 800 | 1600 = 1600): string {
  if (!LOCAL_IMG.test(src)) return src;
  return `${siteUrl.replace(/\/+$/, "")}${src}-${width}.jpg`;
}

/** REQ-1054: archivos que deben existir en public/ para una imagen del sitio. */
export function imageFiles(src: string): string[] {
  if (!LOCAL_IMG.test(src)) return [];
  return IMAGE_WIDTHS.flatMap((w) => IMAGE_FORMATS.map((f) => `public${src}-${w}.${f}`));
}

// REQ-1054
export function aspectFor(kind: string): [number, number] {
  switch (kind) {
    case "portada": case "banner": return [21, 9];
    case "ancho": return [16, 9];
    case "columna": return [3, 2];
    case "dos": return [4, 5];
    default: return [4, 3];
  }
}

/** Todas las imágenes de una entrada: portada y cuerpo, con su formato. */
export function allImages(p: Post): { where: string; kind: string; img: BlogImage }[] {
  return [
    ...(p.cover ? [{ where: "portada", kind: "portada", img: p.cover }] : []),
    ...(p.imagenes ?? []).flatMap((b, i) => b.fotos.map((img, j) => ({ where: `imagenes[${i}].fotos[${j}]`, kind: b.formato, img }))),
  ];
}

const host = (u: string) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } };
const COUNT: Record<string, [number, number]> = { banner: [1, 1], ancho: [1, 1], columna: [1, 1], dos: [2, 2], collage: [3, 5], galeria: [3, 5] };

// REQ-1051 + REQ-1052
export function imageProblems(p: Post): string[] {
  const out: string[] = [];
  if (!p.cover?.license) out.push("falta la portada (hero) con licencia");
  const body = (p.imagenes ?? []).reduce((n, b) => n + b.fotos.length, 0);
  if (body < BODY_PHOTOS.min || body > BODY_PHOTOS.max) out.push(`el cuerpo necesita de ${BODY_PHOTOS.min} a ${BODY_PHOTOS.max} fotos (tiene ${body})`);
  for (const b of p.imagenes ?? []) {
    const [lo, hi] = COUNT[b.formato];
    if (b.fotos.length < lo || b.fotos.length > hi) out.push(`formato «${b.formato}» lleva ${lo === hi ? lo : `${lo} a ${hi}`} fotos (tiene ${b.fotos.length})`);
    if (b.despues >= p.sections.length) out.push(`imagen después de la sección ${b.despues}: la entrada tiene ${p.sections.length}`);
  }
  const seen = new Set<string>();
  for (const { where, img } of allImages(p)) {
    if (seen.has(img.src)) out.push(`${where}: imagen repetida (${img.src})`);
    seen.add(img.src);
    const m = LOCAL_IMG.exec(img.src);
    if (!m || m[1] !== p.slug) out.push(`${where}: la imagen se sirve desde el sitio en /blog/img/${p.slug}/{nombre}`);
    const urls = [img.src, img.origen?.pagina ?? "", img.origen?.descarga ?? ""];
    if (urls.some((u) => /free ?tour/i.test(u))) out.push(`${where}: nunca fotos del proveedor de free tours en el blog (C2/C5)`);
    if (urls.some((u) => host(u) === "plus.unsplash.com")) out.push(`${where}: Unsplash+ no tiene licencia libre`);
    if (!img.license) { out.push(`${where}: falta la licencia`); continue; }
    if (!img.origen) { out.push(`${where}: falta el origen (banco, id, página y autor)`); continue; }
    const bank = img.origen.banco;
    if (img.license.name !== LICENSE_BY_BANK[bank]) out.push(`${where}: la licencia no corresponde al banco (${bank} → ${LICENSE_BY_BANK[bank]})`);
    if (!PAGE_HOST[bank].test(host(img.origen.pagina))) out.push(`${where}: la página de origen no es de ${bank}`);
    if (img.origen.descarga && !DOWNLOAD_HOST[bank].test(host(img.origen.descarga))) out.push(`${where}: la descarga no es del banco ${bank}`);
    if (bank === "proveedor" && !PROVEEDORES_FOTOS_CON_PERMISO.includes(img.origen.autor)) out.push(`${where}: foto de proveedor sin permiso escrito (${img.origen.autor})`);
    if (!img.credit.includes(img.origen.autor) || (BANK_LABEL[bank] && !img.credit.includes(BANK_LABEL[bank]))) out.push(`${where}: el crédito debe nombrar al autor y al banco («Foto: ${img.origen.autor}${BANK_LABEL[bank] ? ` / ${BANK_LABEL[bank]}` : ""}»)`);
  }
  return out;
}

/**
 * REQ-1054: de dónde se baja el original. Unsplash y Pexels por su CDN (con ancho máximo); Pixabay por id con la API
 * (`PIXABAY_API_KEY`, el mismo mecanismo del import de viajes); proveedor, solo con `descarga`.
 */
export function downloadPlan(img: BlogImage): { kind: "url"; url: string } | { kind: "pixabay"; id: number } | null {
  const o = img.origen;
  if (!o) return null;
  const strip = (u: string) => u.split("?")[0];
  switch (o.banco) {
    case "unsplash": return o.descarga ? { kind: "url", url: `${strip(o.descarga)}?w=2400&q=85&fm=jpg` } : null;
    case "pexels": return { kind: "url", url: `https://images.pexels.com/photos/${o.id}/pexels-photo-${o.id}.jpeg?auto=compress&cs=tinysrgb&w=2400` };
    case "pixabay": return /^\d+$/.test(o.id) ? { kind: "pixabay", id: Number(o.id) } : null;
    default: return o.descarga ? { kind: "url", url: o.descarga } : null;
  }
}
