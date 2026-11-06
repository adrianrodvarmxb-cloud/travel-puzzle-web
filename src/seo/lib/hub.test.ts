import { describe, it, expect } from "vitest";
import { featuredActivities, canonicalUrl, findCanonicalConflicts } from "./hub";

const t = (id: string, reviews: number, rating = 4.5, active = true) => ({ id, title: `Tour ${id}`, href: `/destinos/peru/lima/${id}`, reviews, rating, active });

describe("REQ-101: «Actividades destacadas» y canonical propio", () => {
  it("REQ-101: los 3 tours activos principales, enlazados, por reseñas y luego calificación", () => {
    const f = featuredActivities([t("a", 10), t("b", 500), t("c", 90, 4.9), t("d", 90, 4.6), t("e", 9999, 5, false)]);
    expect(f?.label).toBe("Actividades destacadas");
    expect(f?.items).toEqual([
      { title: "Tour b", href: "/destinos/peru/lima/b" },
      { title: "Tour c", href: "/destinos/peru/lima/c" },
      { title: "Tour d", href: "/destinos/peru/lima/d" },
    ]);
  });
  it("REQ-101: con menos de 3 muestra los que hay; sin tours no hay línea", () => {
    expect(featuredActivities([t("a", 1)])?.items).toHaveLength(1);
    expect(featuredActivities([])).toBeNull();
  });
  it("REQ-101: canonical absoluto, sin query, hash ni diagonal final", () => {
    expect(canonicalUrl("https://travelpuzzle.com.mx/", "/destinos/peru/?utm=x#top")).toBe("https://travelpuzzle.com.mx/destinos/peru");
    expect(canonicalUrl("https://travelpuzzle.com.mx", "/")).toBe("https://travelpuzzle.com.mx/");
  });
  it("REQ-101: detecta dos páginas que compiten por el mismo canonical", () => {
    expect(findCanonicalConflicts([
      { path: "/destinos/peru", canonical: "https://t.mx/destinos/peru" },
      { path: "/tours?countryId=1", canonical: "https://t.mx/destinos/peru" },
      { path: "/destinos/china", canonical: "https://t.mx/destinos/china" },
    ])).toEqual([{ canonical: "https://t.mx/destinos/peru", paths: ["/destinos/peru", "/tours?countryId=1"] }]);
  });
});
