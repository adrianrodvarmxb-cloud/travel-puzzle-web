/** Modelos ya calculados para las vistas del blog (ISP: los componentes no reciben el registro entero). Puro. */
import type { Post } from "./schema";
import { wordCount } from "./schema";
import { pillarBySlug, commercialHref } from "./pillars";
import { related, postPath, pillarPath } from "./registry";
import { readingMinutes } from "./reading-time";
import { tocFor } from "./toc";
import { formatDate } from "./dates";
import { shareLinks } from "./seo";
import { textsOf } from "@/site/lib/vocab";
import type { Author } from "../content/authors";
import { imageVariants } from "./images";
import { blogLabels, pillarIn } from "./i18n";
import { localizePath } from "@/i18n/lib/path";

// REQ-3450: `lang` pinta el pilar y la fecha en el idioma de la página (el artículo ya llega traducido).
export function cardModel(p: Post, lang = "es") {
  const pl = pillarBySlug(p.pillar);
  return {
    href: postPath(p),
    pillar: pl ? pillarIn(pl, lang).name : p.pillar,
    title: p.title,
    summary: p.summary,
    date: formatDate(p.publishedAt, lang),
    draft: p.draft,
    // REQ-1053: la tarjeta usa el JPG de 800 px de la portada
    ...(p.cover ? { cover: { src: imageVariants(p.cover.src).local ? `${p.cover.src}-800.jpg` : p.cover.src, alt: p.cover.alt } } : {}),
  };
}

export function articleModel(p: Post, all: Post[], o: { author: Author; siteUrl: string; primeraPieza: boolean; whatsapp: string | null; authorHref: string | null; lang?: string }) {
  const lang = o.lang ?? "es";
  const labels = blogLabels(lang); // REQ-3450
  const pillar = pillarIn(pillarBySlug(p.pillar)!, lang);
  const r = related(p, all);
  // REQ-1053: el tiempo de lectura cuenta el texto, no los créditos ni los alt de las imágenes
  const words = wordCount(textsOf({ ...p, cover: undefined, imagenes: undefined }).join(" "));
  const commercial = commercialHref(pillar, o.primeraPieza);
  const wa = o.whatsapp ? `https://wa.me/${o.whatsapp}?text=${encodeURIComponent(labels.waText(p.title))}` : null;
  return {
    post: p,
    lang,
    labels,
    pillar: { name: pillar.name, href: pillarPath(pillar.slug), commercialHref: commercial, commercialLabel: pillar.commercial.label },
    author: { name: o.author.name, jobTitle: o.author.jobTitle, href: o.authorHref },
    published: formatDate(p.publishedAt, lang),
    updated: p.updatedAt ? formatDate(p.updatedAt, lang) : null,
    minutes: readingMinutes(words),
    toc: tocFor(p.sections.map((s) => s.h2)),
    share: shareLinks(`${o.siteUrl.replace(/\/+$/, "")}${localizePath(postPath(p), lang as "es")}`, p.title),
    siblings: r.siblings.map((x) => cardModel(x, lang)),
    prev: r.prev ? { href: postPath(r.prev), title: r.prev.title } : null,
    next: r.next ? { href: postPath(r.next), title: r.next.title } : null,
    explore: r.explore.map((g) => ({ name: pillarIn(g.pillar, lang).name, href: pillarPath(g.pillar.slug), posts: g.posts.map((x) => ({ href: postPath(x), title: x.title, current: x.slug === p.slug })) })),
    ctaHref: p.cta.kind === "whatsapp" ? wa : commercial,
  };
}
