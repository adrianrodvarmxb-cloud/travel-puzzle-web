import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { hubCopy } from "./hub-copy";
import { fichaJsonLd, type FichaInput } from "@/seo/lib/ficha-ld";
import { indexableProvider } from "@/seo/lib/enrichment";
import { en } from "@/lib/translations/en";
import { FORMATO_LABEL } from "@/taxonomy/lib/filters";
const FILTER_LABELS_FOR_TEST = FORMATO_LABEL["pieza-libre"];

// REQ-1329 (PO 7-11 15:29: «sí», tras la revisión cumplimiento-freetour): regla de «Free Puzzle» en inglés.
const LEAD = "Free Puzzle is our collection of free tours: book for free and tip your guide what you think is fair. Large groups may have a fixed rate.";

describe("REQ-1329: Free Puzzle en inglés", () => {
  it("REQ-1329: encabezado de la sección Free Puzzle y primera línea con texto propio (D2: tarifa fija en grupos grandes)", () => {
    expect(hubCopy("en").freeHeading("Paris")).toBe("Free Puzzle: free walking tours in Paris");
    expect(hubCopy("en").freeLead).toBe(LEAD);
  });
  it("REQ-1329: la ciudad en inglés usa ese encabezado y esa línea", () => {
    const page = readFileSync("src/app/destinos/[pais]/[ciudad]/page.tsx", "utf8");
    expect(page).toContain("k.freeHeading(city.name)");
    expect(page).toContain("k.freeLead");
  });
  it("REQ-1329: <title> de la ficha de free tour = título real primero, sin cambiar (C4) + «Free tour in {Ciudad} | Travel Puzzle»", () => {
    expect(hubCopy("en").tourTitle("Free Walking Tour: Old Town Secrets ", "Paris", true)).toBe("Free Walking Tour: Old Town Secrets – Free tour in Paris | Travel Puzzle");
  });
  it("REQ-1329: lo que ve el cliente dice «Free Puzzle» (REQ-1103)", () => {
    expect(en["tours.freeBadge"]).toBe("Free Puzzle");
    expect(FILTER_LABELS_FOR_TEST.en).toBe("Free Puzzle");
  });
  it("REQ-1329: JSON-LD del free tour: categoría «Free tour» y sin AggregateRating (D27)", () => {
    const base: FichaInput = { provider: "freetour", lang: "en", url: "https://travelpuzzle.com.mx/en/destinos/fr/paris/x", name: "Old Town", images: [], operator: "Guide", free: true, price: 0, currency: "EUR", ownReviews: { ratingValue: 4.9, reviewCount: 30 } };
    const ld = fichaJsonLd(base) as Record<string, unknown>;
    expect(ld.category).toBe("Free tour");
    expect(ld.aggregateRating).toBeUndefined();
    const paid = fichaJsonLd({ ...base, free: false, price: 20, provider: "propios" }) as Record<string, unknown>;
    expect(paid.category).toBeUndefined();
  });
  it("REQ-1329: las fichas de FREETOUR siguen en noindex (D30)", () => {
    expect(indexableProvider("freetour")).toBe(false);
  });
});

describe("REQ-1329: en español el patrón sigue igual", () => {
  it("REQ-1329: «Pieza libre» en la sección y «Free tour en {Ciudad}» en el título", () => {
    expect(hubCopy("es").freeHeading("París")).toBe("Pieza libre (La Primera Pieza)");
    expect(hubCopy("es").freeLead).toBe("Reservar es gratis; al final le das al guía lo que consideres justo.");
    expect(hubCopy("es").tourTitle("Free tour por el centro", "París", true)).toBe("Free tour por el centro – Free tour en París | Travel Puzzle");
    expect(FILTER_LABELS_FOR_TEST.es).toBe("Pieza libre");
  });
});

// REQ-1329 (C3): nunca «FREETOUR» ni «Freetour» en los textos; siempre «free tour» en dos palabras (con mayúscula solo al inicio).
const COPY_FILES = [
  "src/lib/translations/en.ts", "src/destinations/lib/hub-copy.ts", "src/i18n/lib/copy.ts", "src/home/lib/copy.ts", "src/trips/lib/copy.ts",
  "src/tours/lib/filters-copy.ts", "src/tours/lib/notice.ts", "src/tours/lib/tip-guide.ts", "src/tours/lib/booking-cta.ts", "src/tours/lib/experience-card.ts",
  "src/help/lib/faq.ts", "src/about/lib/content.ts", "src/contact/lib/copy.ts", "src/advisors/lib/copy.ts", "src/legal/lib/labels.ts",
  "src/search/lib/suggest-copy.ts", "src/trips/lib/cross-sell-copy.ts", "src/trips/lib/booking-steps.ts", "src/notifications/lib/booking-email.ts",
  "src/notifications/lib/status-emails.ts", "src/notifications/lib/review-email.ts", "src/trips/lib/request-email.ts", "src/legal/lib/marketing-consent.ts",
  "src/seo/lib/listing-ld.ts", "src/seo/lib/ficha-ld.ts", "src/seo/lib/titles.ts", "src/taxonomy/lib/filters.ts", "src/taxonomy/lib/copy.ts",
  "src/tours/lib/pieza-libre.ts", "src/destinations/lib/pieza-libre-copy.ts", "src/tours/lib/menu.ts", "src/i18n/lib/suggest.ts",
];
function textsOf(file: string): string[] {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const out: string[] = [];
  const walk = (n: ts.Node) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && !ts.isImportDeclaration(n.parent) && !ts.isExportDeclaration(n.parent)) out.push(n.text);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}
const evaluated = (o: unknown): string[] => {
  if (typeof o === "string") return [o];
  if (typeof o === "function") { try { return evaluated((o as (...a: unknown[]) => unknown)("Paris", 3, 2, "France")); } catch { return []; } }
  if (Array.isArray(o)) return o.flatMap(evaluated);
  if (o && typeof o === "object") return Object.values(o).flatMap(evaluated);
  return [];
};

describe("REQ-1329: textos en inglés sin la marca y con «free tour» genérico", () => {
  const bad = (s: string) => /freetour/i.test(s.replace(/\/api\/freetour\//g, "")) || [...s.matchAll(/free[\s_-]*tour/gi)].some((m) => !/^(free tour|Free tour)$/.test(m[0]));
  it("REQ-1329: ningún texto de los módulos de copy (incluido el inglés) dice FREETOUR/Freetour ni «Free Tour»/«free-tour»", () => {
    const hits = COPY_FILES.flatMap((f) => textsOf(f).filter(bad).map((t) => `${f}: ${t.slice(0, 80)}`));
    expect(hits).toEqual([]);
  });
  it("REQ-1329: las plantillas en inglés ya armadas tampoco", () => {
    const hits = [...evaluated(hubCopy("en")), ...Object.values(en)].filter((s) => typeof s === "string" && bad(s));
    expect(hits).toEqual([]);
  });
});
