import { describe, expect, it } from "vitest";
import { faqTopics } from "@/help/lib/faq";
import { FAQ_MIN } from "./blocks";
import { fichaEjemplo } from "./fixtures";
import { keyFactsRows } from "./key-facts";
import { faqFor, faqVisible } from "./faq";

const help = (lang: "es" | "en", id: string) => faqTopics(lang).flatMap((t) => t.items).find((i) => i.id === id)!;

describe("REQ-10822: preguntas frecuentes de la ficha, por regla y solo con datos reales (REQ-10630)", () => {
  it("REQ-10822: la ficha de ejemplo arma preguntas de cancelación, duración, punto de encuentro, idioma, qué llevar, niños y pago", () => {
    const ids = faqFor(fichaEjemplo()).map((q) => q.id);
    expect(ids).toEqual(["cancelacion", "duracion", "punto-de-encuentro", "idioma", "que-llevar", "ninos", "pago", "llegar-tarde"]);
  });

  it("REQ-10822: sin dato no hay pregunta; nunca «N/D»", () => {
    const f = fichaEjemplo();
    f.cancellation = null; f.facts.durationMinutes = null; f.facts.languages = []; f.whatToBring = []; f.facts.ages = null; f.price = null;
    f.meeting = { kind: "none", title: null };
    const qs = faqFor(f);
    expect(qs).toEqual([]);
    expect(JSON.stringify(faqFor(fichaEjemplo()))).not.toMatch(/N\/D/);
  });

  it("REQ-10822: con menos de tres preguntas el bloque no sale (FAQ_MIN de blocks.ts)", () => {
    const f = fichaEjemplo();
    f.cancellation = null; f.facts.durationMinutes = null; f.facts.languages = []; f.whatToBring = []; f.facts.ages = null; f.price = null;
    f.meeting = { kind: "exact", lat: -50.3, lng: -72.3, title: "Hotel" };
    const qs = faqFor(f);
    expect(qs.length).toBeLessThan(FAQ_MIN);
    expect(faqVisible(qs)).toBe(false);
    expect(faqVisible(faqFor(fichaEjemplo()))).toBe(true);
  });

  it("REQ-10822: duración e idioma salen del mismo dato que «Datos clave» (y el voucher; REQ-10803)", () => {
    const f = fichaEjemplo();
    const rows = keyFactsRows(f.facts, "es");
    const qs = faqFor(f);
    expect(qs.find((q) => q.id === "duracion")!.a).toContain(rows.find((r) => r.id === "duracion")!.value);
    expect(qs.find((q) => q.id === "idioma")!.a).toContain(rows.find((r) => r.id === "idiomas")!.value);
  });

  it("REQ-10822: los textos generales son los mismos de /ayuda (pago, qué llevar, llegar tarde) en español e inglés", () => {
    const es = faqFor(fichaEjemplo());
    expect(es.find((q) => q.id === "pago")!.a).toBe(help("es", "pago").a);
    expect(es.find((q) => q.id === "que-llevar")!.q).toBe(help("es", "que-llevar").q);
    expect(es.find((q) => q.id === "llegar-tarde")!.a).toBe(help("es", "no-llego").a);
    const f = fichaEjemplo(); f.lang = "en";
    const en = faqFor(f);
    expect(en.find((q) => q.id === "pago")!.a).toBe(help("en", "pago").a);
    expect(en.find((q) => q.id === "cancelacion")!.a).toBe("Free cancellation up to 48 h before departure.");
  });

  it("REQ-10822: un free tour usa el texto de propina de /ayuda en lugar del de pago", () => {
    const f = fichaEjemplo();
    f.price = { amount: 0, currency: "EUR", per: "person" };
    f.booking = { mode: "calendar", chargedBy: "none", leadHours: null };
    const qs = faqFor(f);
    expect(qs.find((q) => q.id === "pago")).toBeUndefined();
    expect(qs.find((q) => q.id === "gratis")!.a).toBe(help("es", "gratis").a);
  });

  it("REQ-10822: zona aproximada sin título no inventa dirección; con título lo repite", () => {
    const f = fichaEjemplo();
    f.meeting = { kind: "zone", lat: -50.3, lng: -72.3, radiusM: 800, title: null };
    expect(faqFor(f).find((q) => q.id === "punto-de-encuentro")).toBeUndefined();
    f.meeting = { kind: "zone", lat: -50.3, lng: -72.3, radiusM: 800, title: "Centro de El Calafate" };
    expect(faqFor(f).find((q) => q.id === "punto-de-encuentro")!.a).toContain("Centro de El Calafate");
  });

  it("REQ-10822: ninguna pregunta nombra al operador ni trae neto o teléfonos", () => {
    const todo = JSON.stringify(faqFor(fichaEjemplo()));
    expect(todo).not.toMatch(/Operador de ejemplo|neto|\+?\d{10,}/);
  });
});
