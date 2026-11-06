import { describe, it, expect } from "vitest";
import { slugify, trimSlug, tourSlug, uniqueSlug, fallbackTourSlug, TOUR_SLUG_MAX } from "./slug";

const VALID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("slugify", () => {
  it("REQ-086: minúsculas, sin acentos y solo [a-z0-9-]", () => {
    expect(slugify("Ciudad de México: Free Tour por el Centro Histórico!")).toBe("ciudad-de-mexico-free-tour-por-el-centro-historico");
    expect(slugify("  São Paulo — Açaí & Café  ")).toBe("sao-paulo-acai-y-cafe");
    expect(slugify("Kraków's Old Town")).toBe("krakows-old-town");
    expect(slugify("Straße, Ærø, Łódź, Øresund")).toBe("strasse-aero-lodz-oresund");
  });

  it("REQ-086: el chino se escribe en pinyin sin tonos", () => {
    expect(slugify("北京")).toBe("beijing");
    expect(slugify("张家界")).toBe("zhangjiajie");
    expect(slugify("上海 Free Tour")).toBe("shanghai-free-tour");
    expect(slugify("北京长城一日游")).toBe("bei-jing-chang-cheng-yi-ri-you");
    expect(slugify("绿")).toBe("lu");
  });

  it("REQ-086: el resultado siempre cumple el formato", () => {
    for (const t of ["Tour #1 — ¡Gratis!", "Évora / Lisboa", "Москва Moscow", "---a---", "100% Roma"]) {
      expect(slugify(t)).toMatch(VALID);
    }
  });

  it("REQ-086: sin letras latinas ni chino queda vacío", () => {
    expect(slugify("Ταξίδι")).toBe("");
    expect(slugify("")).toBe("");
  });
});

describe("tourSlug y trimSlug", () => {
  it("REQ-086: ≤ 60 caracteres sin cortar una palabra a la mitad", () => {
    const title = "Free Tour por el Barrio Gótico de Barcelona con guía local en español y leyendas";
    const s = tourSlug(title);
    expect(s.length).toBeLessThanOrEqual(TOUR_SLUG_MAX);
    expect(s).toBe("free-tour-por-el-barrio-gotico-de-barcelona-con-guia-local");
    expect(slugify(title).startsWith(s + "-")).toBe(true);
  });

  it("REQ-086: si no hay guion antes del límite, corta en el límite", () => {
    expect(trimSlug("a".repeat(80), 60)).toBe("a".repeat(60));
  });

  it("REQ-086: si cabe, no se recorta", () => {
    expect(trimSlug("tour-corto", 60)).toBe("tour-corto");
  });
});

describe("uniqueSlug", () => {
  it("REQ-086: si choca, agrega un sufijo corto", () => {
    expect(uniqueSlug("free-tour-lima", new Set())).toBe("free-tour-lima");
    expect(uniqueSlug("free-tour-lima", new Set(["free-tour-lima"]))).toBe("free-tour-lima-2");
    expect(uniqueSlug("free-tour-lima", new Set(["free-tour-lima", "free-tour-lima-2"]))).toBe("free-tour-lima-3");
  });

  it("REQ-086: con sufijo tampoco pasa de 60 caracteres", () => {
    const base = tourSlug("Free Tour por el Barrio Gótico de Barcelona con guía local en español");
    const s = uniqueSlug(base, new Set([base]));
    expect(s.length).toBeLessThanOrEqual(TOUR_SLUG_MAX);
    expect(s).toMatch(/-2$/);
    expect(s).toMatch(VALID);
  });
});

describe("fallbackTourSlug", () => {
  it("REQ-085: el slug de reserva sale del id interno, no del id del proveedor", () => {
    const s = fallbackTourSlug("cm9x1tour0001");
    expect(s).toMatch(/^tour-[a-z0-9]{7}$/);
    expect(s).toBe(fallbackTourSlug("cm9x1tour0001"));
    expect(s).not.toBe(fallbackTourSlug("cm9x1tour0002"));
  });
});
