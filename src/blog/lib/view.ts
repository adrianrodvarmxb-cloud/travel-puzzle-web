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

export function cardModel(p: Post) {
  return {
    href: postPath(p),
    pillar: pillarBySlug(p.pillar)?.name ?? p.pillar,
    title: p.title,
    summary: p.summary,
    date: formatDate(p.publishedAt, "es"),
    draft: p.draft,
    ...(p.cover ? { cover: { src: p.cover.src, alt: p.cover.alt } } : {}),
  };
}

export function articleModel(p: Post, all: Post[], o: { author: Author; siteUrl: string; primeraPieza: boolean; whatsapp: string | null; authorHref: string | null }) {
  const pillar = pillarBySlug(p.pillar)!;
  const r = related(p, all);
  const words = wordCount(textsOf(p).join(" "));
  const commercial = commercialHref(pillar, o.primeraPieza);
  const wa = o.whatsapp ? `https://wa.me/${o.whatsapp}?text=${encodeURIComponent(`Hola Travel Puzzle, leí «${p.title}» y quiero ayuda con mi viaje.`)}` : null;
  return {
    post: p,
    pillar: { name: pillar.name, href: pillarPath(pillar.slug), commercialHref: commercial, commercialLabel: pillar.commercial.label },
    author: { name: o.author.name, jobTitle: o.author.jobTitle, href: o.authorHref },
    published: formatDate(p.publishedAt, "es"),
    updated: p.updatedAt ? formatDate(p.updatedAt, "es") : null,
    minutes: readingMinutes(words),
    toc: tocFor(p.sections.map((s) => s.h2)),
    share: shareLinks(`${o.siteUrl.replace(/\/+$/, "")}${postPath(p)}`, p.title),
    siblings: r.siblings.map(cardModel),
    prev: r.prev ? { href: postPath(r.prev), title: r.prev.title } : null,
    next: r.next ? { href: postPath(r.next), title: r.next.title } : null,
    explore: r.explore.map((g) => ({ name: g.pillar.name, href: pillarPath(g.pillar.slug), posts: g.posts.map((x) => ({ href: postPath(x), title: x.title, current: x.slug === p.slug })) })),
    ctaHref: p.cta.kind === "whatsapp" ? wa : commercial,
  };
}
