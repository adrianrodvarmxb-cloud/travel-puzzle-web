import { describe, it, expect } from "vitest";
import { websiteJsonLd, organizationJsonLd, touristDestinationJsonLd, productJsonLd, breadcrumbJsonLd, faqJsonLd, serializeJsonLd } from "./jsonld";

const site = "https://travelpuzzle.com.mx";

describe("REQ-100: JSON-LD", () => {
  it("REQ-100: WebSite con SearchAction hacia el buscador de /tours", () => {
    const w = websiteJsonLd(site);
    expect(w).toMatchObject({ "@context": "https://schema.org", "@type": "WebSite", name: "Travel Puzzle", url: site });
    expect(w.potentialAction).toEqual({ "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${site}/tours?search={search_term_string}` }, "query-input": "required name=search_term_string" });
  });
  it("REQ-100: Organization con logo y sameAs solo a URLs https reales", () => {
    const o = organizationJsonLd(site, ["https://www.instagram.com/travelpuzzle/", "https://facebook.com/travelpuzzle", "", "javascript:alert(1)"]);
    expect(o).toMatchObject({ "@type": "Organization", name: "Travel Puzzle", url: site, logo: `${site}/icon.png` });
    expect(o.sameAs).toEqual(["https://www.instagram.com/travelpuzzle/", "https://facebook.com/travelpuzzle"]);
  });
  it("REQ-100: TouristDestination con addressCountry ISO 3166-1 alfa-2", () => {
    const d = touristDestinationJsonLd({ name: "Lima", url: `${site}/destinos/peru/lima`, countryCode: "pe" });
    expect(d).toMatchObject({ "@type": "TouristDestination", name: "Lima", address: { "@type": "PostalAddress", addressCountry: "PE" } });
    expect(touristDestinationJsonLd({ name: "X", url: site, countryCode: "PER" }).address).toBeUndefined();
  });
  it("REQ-100: Product + Offer en EUR, price 0 en free tour sin tarifa fija", () => {
    const p = productJsonLd({ name: "Free Tour Lima", url: `${site}/destinos/peru/lima/free-tour-lima`, image: null, provider: "Lima Walking Tours", price: 0, rating: null, reviews: 0 });
    expect(p.offers).toEqual({ "@type": "Offer", price: 0, priceCurrency: "EUR", url: `${site}/destinos/peru/lima/free-tour-lima`, availability: "https://schema.org/InStock" });
    expect(p.brand).toEqual({ "@type": "Brand", name: "Lima Walking Tours" });
    expect(p.aggregateRating).toBeUndefined();
  });
  it("REQ-100: AggregateRating solo con reseñas reales", () => {
    const withReviews = productJsonLd({ name: "T", url: site, image: "https://x/y.jpg", provider: null, price: 25, rating: "4.83", reviews: 120 });
    expect(withReviews.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.83, reviewCount: 120, bestRating: 5 });
    expect(withReviews.offers.price).toBe(25);
    expect(productJsonLd({ name: "T", url: site, image: null, provider: null, price: 0, rating: 4.9, reviews: 0 }).aggregateRating).toBeUndefined();
    expect(productJsonLd({ name: "T", url: site, image: null, provider: null, price: 0, rating: null, reviews: 30 }).aggregateRating).toBeUndefined();
  });
  it("REQ-100: BreadcrumbList con posiciones 1..n", () => {
    const b = breadcrumbJsonLd([{ name: "Destinos", url: `${site}/destinos` }, { name: "Perú", url: `${site}/destinos/peru` }]);
    expect(b.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Destinos", item: `${site}/destinos` },
      { "@type": "ListItem", position: 2, name: "Perú", item: `${site}/destinos/peru` },
    ]);
  });
  it("REQ-100: FAQPage solo con 3 a 5 preguntas", () => {
    const qa = (n: number) => Array.from({ length: n }, (_, i) => ({ q: `¿P${i}?`, a: `R${i}` }));
    expect(faqJsonLd(qa(2))).toBeNull();
    expect(faqJsonLd(qa(6))).toBeNull();
    const f = faqJsonLd(qa(3));
    expect(f?.mainEntity).toHaveLength(3);
    expect(f?.mainEntity[0]).toEqual({ "@type": "Question", name: "¿P0?", acceptedAnswer: { "@type": "Answer", text: "R0" } });
    expect(faqJsonLd(qa(5))?.mainEntity).toHaveLength(5);
  });
  it("REQ-100: se serializa sin poder cerrar la etiqueta <script>", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).not.toContain("</script>");
  });
});
