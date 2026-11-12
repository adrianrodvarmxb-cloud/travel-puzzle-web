import { describe, expect, it } from "vitest";
import { postSchema } from "./schema";
import { blogLabels, localizePost, pillarIn, postLangs, postsIn } from "./i18n";
import { pillarBySlug } from "./pillars";

const sections = [1, 2, 3, 4].map((i) => ({ h2: `¿Pregunta ${i}?`, answer: `Respuesta ${i}.`, body: [`Cuerpo ${i}.`] }));
const enSections = [1, 2, 3, 4].map((i) => ({ h2: `Question ${i}?`, answer: `Answer ${i}.`, body: [`Body ${i}.`] }));
const raw = (o: Record<string, unknown> = {}) => ({
  slug: "prueba", pillar: "europa", targetTerm: "prueba europa", title: "Título", summary: "Resumen", draft: false,
  publishedAt: "2026-11-07", author: "editorial", enBreve: "En breve.", entrada: "Entrada.", sections,
  datos: [{ text: "Dato.", source: { label: "Fuente", url: "https://example.org" }, checkedAt: "2026-11-07" }],
  comoLoSabemos: "Con IA.", visual: { kind: "tabla", caption: "Tabla", head: ["A", "B"], rows: [["1", "2"]] },
  cta: { kind: "comercial", label: "Ver tours" },
  cover: { src: "/blog/img/x/portada", alt: "Portada", credit: "Foto" },
  ...o,
});
const en = { targetTerm: "test europe", title: "Title", summary: "Summary", enBreve: "In short.", entrada: "Intro.", sections: enSections,
  datos: [{ text: "Fact." }], comoLoSabemos: "With AI.", visual: { caption: "Table", head: ["A", "B"], rows: [["one", "two"]] }, cta: { label: "See tours" }, cover: { alt: "Cover" } };
const post = (o: Record<string, unknown> = {}) => postSchema.parse(raw(o));

describe("REQ-3449: artículo del blog en inglés", () => {
  it("REQ-3449: el esquema acepta la versión en inglés y postLangs la reporta", () => {
    expect(postLangs(post({ en }))).toEqual(["es", "en"]);
    expect(postLangs(post())).toEqual(["es"]);
  });

  it("REQ-3449: localizePost en inglés cambia los textos y conserva fuentes, fechas e imágenes", () => {
    const p = localizePost(post({ en }), "en")!;
    expect(p).toMatchObject({ title: "Title", summary: "Summary", enBreve: "In short.", entrada: "Intro.", comoLoSabemos: "With AI.", publishedAt: "2026-11-07" });
    expect(p.sections[0].h2).toBe("Question 1?");
    expect(p.datos?.[0]).toMatchObject({ text: "Fact.", source: { url: "https://example.org" } });
    expect(p.visual).toMatchObject({ kind: "tabla", caption: "Table", rows: [["one", "two"]] });
    expect(p.cta).toEqual({ kind: "comercial", label: "See tours" });
    expect(p.cover).toMatchObject({ src: "/blog/img/x/portada", alt: "Cover" });
  });

  it("REQ-3449: el crédito de las fotos dice «Photo:» en inglés (el autor y el banco no cambian)", () => {
    const p = localizePost(post({ en, cover: { src: "/blog/img/x/portada", alt: "Portada", credit: "Foto: Ana / Unsplash" } }), "en")!;
    expect(p.cover?.credit).toBe("Photo: Ana / Unsplash");
  });

  it("REQ-3449: en español queda igual; sin versión en inglés, null en inglés (nunca el español)", () => {
    const p = post({ en });
    expect(localizePost(p, "es")).toBe(p);
    expect(localizePost(post(), "en")).toBeNull();
    expect(localizePost(post({ en }), "fr")).toBeNull();
  });

  it("REQ-3449: postsIn deja solo las entradas que existen en ese idioma, ya traducidas", () => {
    expect(postsIn([post({ en }), post({ slug: "otra" })], "en").map((p) => p.title)).toEqual(["Title"]);
    expect(postsIn([post({ en }), post({ slug: "otra" })], "es")).toHaveLength(2);
  });
});

describe("REQ-3451: pilares y rótulos del blog en inglés", () => {
  it("REQ-3451: el pilar tiene nombre, h1, intro y botón en inglés", () => {
    const p = pillarIn(pillarBySlug("europa")!, "en");
    expect(p).toMatchObject({ slug: "europa", name: "Europe, first trip" });
    expect(p.commercial.label).toBe("See tours in Europe");
    expect(pillarIn(pillarBySlug("europa")!, "es").name).toBe("Europa, primer viaje");
  });

  it("REQ-3450: rótulos de la vista en cada idioma", () => {
    expect(blogLabels("es").brief).toBe("En breve");
    expect(blogLabels("en")).toMatchObject({ brief: "In short", how: "How we know", all: "← All articles", faq: "Frequently asked questions" });
  });
});

describe("REQ-3450: idiomas de las páginas del blog", () => {
  it("REQ-3450: una página existe en inglés si al menos una entrada tiene versión en inglés", async () => {
    const { blogLangs } = await import("./i18n");
    expect(blogLangs([post({ en }), post({ slug: "otra" })])).toEqual(["es", "en"]);
    expect(blogLangs([post()])).toEqual(["es"]);
    expect(blogLangs([])).toEqual([]);
  });

  it("REQ-3450: rótulos del índice y del pilar en inglés", () => {
    expect(blogLabels("en")).toMatchObject({ filter: "Filter by destination", pillarPosts: "Articles in this guide", inLanguage: "en-US" });
    expect(blogLabels("en").pillarTitle("Traveling to Peru from Mexico")).toBe("Traveling to Peru from Mexico: guide");
  });
});
