import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

// REQ-1330 (PO 7-11 15:39: «B»): precio e insignia de free tour («Free tour» / «Pieza libre» / «Free Puzzle») en verde
// #4ADE80, con UN token compartido (sin hex sueltos) en tarjeta y ficha.
const read = (f: string) => readFileSync(f, "utf8");
const FREE_HEX = /--tp-free:\s*(#[0-9A-Fa-f]{6})/;

describe("REQ-1330: token verde de free tour", () => {
  it("REQ-1330: el token vive en un solo lugar (#4ADE80) y Tailwind lo expone como `free`", () => {
    expect(read("src/styles/design-system/colors.css").match(FREE_HEX)?.[1].toUpperCase()).toBe("#4ADE80");
    expect(read("src/app/globals.css")).toMatch(/--color-free:\s*var\(--tp-free\)/);
  });
  it("REQ-1330: tarjeta (card-price cuando es gratis) y ficha (insignia y barra móvil) usan el token", () => {
    const card = read("src/components/tours/ExperienceCard.tsx");
    expect(card).toMatch(/card\.price\.free \? 'text-free'/);
    const hero = read("src/components/tours/one/TourHeroSection.tsx");
    expect(hero).toMatch(/border-free[^"]*text-free[^"]*">\{t\('tours\.freeBadge'/);
    const bar = read("src/components/tours/one/TourMobileBar.tsx");
    expect(bar).toMatch(/tour\.price === 0 \? 'text-free'/);
  });
  it("REQ-1330: ninguna insignia o precio de free tour conserva un hex suelto (#EAF54F, #7CC4FF)", () => {
    for (const f of ["src/components/tours/ExperienceCard.tsx", "src/components/tours/one/TourHeroSection.tsx", "src/components/tours/TourCard.tsx", "src/components/home/v2/FeaturedTours.tsx"]) {
      const lines = read(f).split("\n").filter((l) => /freeBadge|price\.free/.test(l));
      expect(lines.length, f).toBeGreaterThan(0);
      for (const l of lines) expect(l, f).not.toMatch(/#(EAF54F|7CC4FF|4ADE80)/i);
    }
  });
  it("REQ-1330: contraste AA (≥ 4.5:1) sobre #121F45 y #0B1530", () => {
    const hex = read("src/styles/design-system/colors.css").match(FREE_HEX)![1];
    expect(contrastRatio(hex, "#121F45")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hex, "#0B1530")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });
});
