import { describe, expect, it } from "vitest";
import { robotsTxt, AI_SEARCH_BOTS } from "./robots";

/** Grupo que aplica a un user-agent (el suyo o el de «*») y sus Disallow, como lo leen los bots (RFC 9309). */
function disallowsFor(txt: string, ua: string): string[] {
  const groups = txt.split(/\n\s*\n/).map((g) => ({ uas: [...g.matchAll(/^User-agent:\s*(.+)$/gim)].map((m) => m[1].trim().toLowerCase()), dis: [...g.matchAll(/^Disallow:\s*(.*)$/gim)].map((m) => m[1].trim()).filter(Boolean) }));
  const own = groups.find((g) => g.uas.includes(ua.toLowerCase()));
  return (own ?? groups.find((g) => g.uas.includes("*")) ?? { dis: [] }).dis;
}

describe("REQ-585: robots.txt no bloquea a los bots de búsqueda ni de IA", () => {
  const txt = robotsTxt({ sitemapUrl: "https://travelpuzzle.com.mx/sitemap-index.xml" });
  for (const ua of ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Claude-User", "Bingbot", "Googlebot"]) {
    it(`REQ-585: ${ua} puede leer fichas y listados`, () => {
      const dis = disallowsFor(txt, ua);
      for (const path of ["/", "/destinos/mx/ciudad-de-mexico/centro", "/viajes/francia/louvre", "/tours", "/sitemap-index.xml"]) expect(dis.some((d) => path.startsWith(d))).toBe(false);
    });
  }
  it("REQ-585: los bots de búsqueda con IA siguen nombrados y el sitemap declarado", () => {
    for (const ua of AI_SEARCH_BOTS) expect(txt).toContain(`User-agent: ${ua}\nAllow: /`);
    expect(txt).toContain("Sitemap: https://travelpuzzle.com.mx/sitemap-index.xml");
  });
});
