import { describe, it, expect } from "vitest";
import { robotsTxt, llmsTxt, AI_SEARCH_BOTS } from "./robots";

describe("REQ-103: robots.txt para buscadores con IA", () => {
  it("REQ-103: permite OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot y Claude-User", () => {
    expect(AI_SEARCH_BOTS).toEqual(["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Claude-User"]);
    const r = robotsTxt({});
    for (const bot of AI_SEARCH_BOTS) expect(r).toContain(`User-agent: ${bot}\nAllow: /`);
    expect(r).toContain("User-agent: *\nAllow: /");
  });
  it("REQ-103 + REQ-089: nunca bloquea páginas (las ciudades en noindex tampoco van en robots)", () => {
    expect(robotsTxt({ sitemapUrl: "https://t.mx/sitemap-index.xml" })).not.toMatch(/Disallow/i);
  });
  it("REQ-103: el Sitemap solo aparece cuando existe", () => {
    expect(robotsTxt({})).not.toContain("Sitemap:");
    expect(robotsTxt({ sitemapUrl: "https://t.mx/sitemap-index.xml" })).toContain("Sitemap: https://t.mx/sitemap-index.xml");
  });
});

describe("REQ-103: llms.txt", () => {
  const destinations = [{ name: "Perú", url: "https://t.mx/destinos/peru" }, { name: "China", url: "https://t.mx/destinos/china" }];
  it("REQ-103: menciona La Primera Pieza y los destinos", () => {
    const l = llmsTxt({ siteUrl: "https://t.mx", destinations });
    expect(l.startsWith("# Travel Puzzle\n")).toBe(true);
    expect(l).toContain("[La Primera Pieza](https://t.mx/la-primera-pieza)");
    expect(l).toContain("[Perú](https://t.mx/destinos/peru)");
    expect(l).toContain("[China](https://t.mx/destinos/china)");
  });
  it("REQ-103: sin destinos con página todavía, no inventa la sección", () => {
    expect(llmsTxt({ siteUrl: "https://t.mx", destinations: [] })).not.toContain("## Destinos");
  });
  it("REQ-103: no copia ni nombra a FREETOUR", () => {
    expect(llmsTxt({ siteUrl: "https://t.mx", destinations })).not.toMatch(/freetour/i);
  });
});
