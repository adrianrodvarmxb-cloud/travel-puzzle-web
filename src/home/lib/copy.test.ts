import { describe, it, expect } from "vitest";
import { homeCopy } from "./copy";
import { SITE_META } from "@/seo/lib/meta";
import { es } from "@/lib/translations/es";
import { en } from "@/lib/translations/en";

/** Línea de comunicación: nada inflado ni adjetivos que despierten sospecha (ADN de Mila). */
const PROHIBIDAS = /(free ?tour\.com|freetour)|\b(reales?|real|miles|thousands|increíbles?|amazing|garantizad[oa]s?|guaranteed|el mejor|los mejores|the best|única?o?|the only)\b/i;

function textos(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (typeof obj === "function") {
    const out = (obj as (...a: unknown[]) => unknown)("1", "2");
    return typeof out === "string" ? [out] : Array.isArray(out) ? out.flat(2).filter((x): x is string => typeof x === "string") : [];
  }
  if (Array.isArray(obj)) return obj.flatMap(textos);
  if (obj && typeof obj === "object") return Object.values(obj).flatMap(textos);
  return [];
}

describe("línea de comunicación", () => {
  it.each(["es", "en"])("el inicio (%s) no usa palabras infladas", (lang) => {
    const c = homeCopy(lang);
    const all = [...textos(c), ...c.howSteps(true).flat(), ...c.howSteps(false).flat()];
    expect(all.filter((t) => PROHIBIDAS.test(t))).toEqual([]);
  });
  it("las traducciones visibles tampoco", () => {
    const vals = [...Object.values(es), ...Object.values(en)] as string[];
    expect(vals.filter((t) => PROHIBIDAS.test(t))).toEqual([]);
  });
  it("la vista previa al compartir tampoco", () => {
    expect(PROHIBIDAS.test(`${SITE_META.title} ${SITE_META.description}`)).toBe(false);
  });
  it("usa el lema registrado", () => {
    expect(homeCopy("es").footerSlogan).toBe("Te armamos tu viaje");
  });
});
