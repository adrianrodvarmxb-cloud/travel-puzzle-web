/** REQ-575: JSON-LD de la home (WebSite con SearchAction + Organization). Puro. Mismo @id que /nosotros y /contacto (REQ-245). */
import { organizationJsonLd, websiteJsonLd } from "./jsonld";
import { ORG_ID } from "./pages-jsonld";

// REQ-575
export function homeJsonLd(siteUrl: string, socials: { name: string; url: string }[]) {
  const id = ORG_ID(siteUrl);
  return [
    { ...websiteJsonLd(siteUrl), publisher: { "@id": id } },
    { ...organizationJsonLd(siteUrl, socials.map((s) => s.url)), "@id": id },
  ];
}
