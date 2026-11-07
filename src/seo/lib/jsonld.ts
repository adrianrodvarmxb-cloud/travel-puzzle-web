/** Datos estructurados schema.org (JSON-LD). Puros: el render los mete en <script type="application/ld+json">. */
import { SITE_META } from "./meta";

const CTX = "https://schema.org";
const base = (u: string) => u.replace(/\/+$/, "");

// REQ-100: WebSite + SearchAction hacia el buscador de /tours (?search=).
export function websiteJsonLd(siteUrl: string) {
  const url = base(siteUrl);
  return {
    "@context": CTX,
    "@type": "WebSite",
    name: SITE_META.name,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${url}/tours?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

// REQ-100: Organization con logo y sameAs (solo URLs https reales; nunca se inventa una red).
export function organizationJsonLd(siteUrl: string, sameAs: string[]) {
  const url = base(siteUrl);
  return {
    "@context": CTX,
    "@type": "Organization",
    name: SITE_META.name,
    url,
    logo: `${url}/icon.png`,
    sameAs: sameAs.filter((s) => /^https:\/\/[^\s]+$/.test(s)),
  };
}

// REQ-100: TouristDestination con addressCountry ISO 3166-1 alfa-2.
export function touristDestinationJsonLd({ name, url, countryCode }: { name: string; url: string; countryCode: string | null }) {
  const iso2 = (countryCode ?? "").trim().toUpperCase();
  return {
    "@context": CTX,
    "@type": "TouristDestination",
    name,
    url,
    ...(/^[A-Z]{2}$/.test(iso2) ? { address: { "@type": "PostalAddress", addressCountry: iso2 } } : {}),
  };
}

export interface ProductInput {
  name: string;
  url: string;
  image: string | null;
  provider: string | null;
  /** EUR; 0 en free tours sin tarifa fija. */
  price: number;
  rating: number | string | null;
  reviews: number;
}

// REQ-100: Product + Offer en EUR.
// REQ-805 (Gate 2, PO 6 nov 2026): `rating` y `reviews` son del proveedor (FREETOUR): nunca van al marcado como
// AggregateRating ni review. Las estrellas siguen visibles en la página. Se reciben para no romper a quien llama.
export function productJsonLd(p: ProductInput) {
  return {
    "@context": CTX,
    "@type": "Product",
    name: p.name,
    url: p.url,
    ...(p.image?.startsWith("https://") ? { image: p.image } : {}),
    ...(p.provider?.trim() ? { brand: { "@type": "Brand", name: p.provider.trim() } } : {}),
    offers: { "@type": "Offer", price: p.price, priceCurrency: "EUR" as const, url: p.url, availability: "https://schema.org/InStock" },
  };
}

// REQ-100: BreadcrumbList (acompaña a las migas visibles).
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": CTX,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

// REQ-100: FAQPage en ciudades, solo con 3 a 5 preguntas.
export function faqJsonLd(qas: { q: string; a: string }[]) {
  if (qas.length < 3 || qas.length > 5) return null;
  return {
    "@context": CTX,
    "@type": "FAQPage",
    mainEntity: qas.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/** Serializa para un <script>: escapa "<" para que ningún texto cierre la etiqueta. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
