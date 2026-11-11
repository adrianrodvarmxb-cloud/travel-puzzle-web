import { describe, it, expect } from "vitest";
import { pagesIndexLastmod } from "./sitemaps";

describe("REQ-1341: el índice marca el lastmod real de sitemap-paginas.xml", () => {
  it("REQ-1341: toma la fecha más reciente de sus URLs", () => {
    expect(pagesIndexLastmod([
      { loc: "https://x/blog", lastmod: "2026-11-10" },
      { loc: "https://x/blog/a", lastmod: "2026-11-07" },
      { loc: "https://x/nosotros", lastmod: null },
    ])).toBe("2026-11-10");
  });
  it("REQ-1341: sin fechas (o sin URLs) no inventa una", () => {
    expect(pagesIndexLastmod([{ loc: "https://x/nosotros", lastmod: null }])).toBeNull();
    expect(pagesIndexLastmod([])).toBeNull();
  });
  it("REQ-1341: ignora fechas mal formadas", () => {
    expect(pagesIndexLastmod([{ loc: "https://x/a", lastmod: "ayer" }, { loc: "https://x/b", lastmod: "2026-11-09" }])).toBe("2026-11-09");
  });
});
