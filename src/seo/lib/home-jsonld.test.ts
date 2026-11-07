import { describe, expect, it } from "vitest";
import { homeJsonLd } from "./home-jsonld";

describe("REQ-575: la home trae WebSite y Organization", () => {
  it("REQ-575: WebSite con SearchAction y Organization con logo, sameAs https y @id estable", () => {
    const [w, o] = homeJsonLd("https://travelpuzzle.com.mx/", [{ name: "Instagram", url: "https://www.instagram.com/travelpuzzle" }, { name: "X", url: "javascript:alert(1)" }]);
    expect(w).toMatchObject({ "@type": "WebSite", url: "https://travelpuzzle.com.mx", potentialAction: { "@type": "SearchAction" } });
    expect(o).toMatchObject({ "@type": "Organization", "@id": "https://travelpuzzle.com.mx/#organization", logo: "https://travelpuzzle.com.mx/icon.png", sameAs: ["https://www.instagram.com/travelpuzzle"] });
    expect(w).toMatchObject({ publisher: { "@id": "https://travelpuzzle.com.mx/#organization" } });
  });
});
