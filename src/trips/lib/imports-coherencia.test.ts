// REQ-10891, REQ-10892 (revisión visual del PO, 26-11-2026): guardián de coherencia de los imports de viajes.
// Lo que dice la ficha sale de una sola fuente: la línea «Duración: …» de la información importante (REQ-821) y el
// idioma del guía de `languages`. Sin excepciones para que pase: si un import no cumple, se corrige el dato.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { infoDurationMinutes, infoHalfDay } from "./trip-facts";

interface TripRow { ref: string; trip: { kind?: string; durationDays?: number | null; summaryEs?: string; descriptionEs?: string; importantInfo?: string; languages?: string[] } }

const DIR = join(process.cwd(), "imports");
const archivos = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const filas = (f: string): TripRow[] => (JSON.parse(readFileSync(join(DIR, f), "utf8")) as { trips?: TripRow[] }).trips ?? [];

/** «Duración aproximada: por confirmar.»: el proveedor no la confirmó; es un dato declarado, no una omisión (Extime DC21, DC13D, DCD18D). */
const POR_CONFIRMAR = /^\s*duraci[oó]n[^:\n]*:\s*por confirmar/im;
/** El resumen habla de medio día o de N horas. */
const HABLA_DE_HORAS = /medio d[ií]a|half[- ]day|\b\d{1,2}\s*(horas?|h\b|hours?)/i;
/** Promete guía en español (una negación como «no hay guía en español» no es promesa). */
const PROMETE_ESPANOL = /gu[ií]a (de habla hispana|en espa[nñ]ol)|spanish[- ]speaking guide/i;
const NEGADO = /\b(no hay|sin|not available|no incluye|without)\b[^.\n]{0,25}(gu[ií]a|guide)/i;

describe("REQ-10891: la duración de un viaje de un día sale de la línea «Duración: …» del import", () => {
  it("REQ-10891: todo viaje de un día cuyo resumen habla de medio día o de horas trae la línea «Duración:» con horas o «medio día»", () => {
    const faltan: string[] = [];
    for (const f of archivos) {
      for (const { ref, trip } of filas(f)) {
        if (trip.kind === "transporte" || (trip.durationDays ?? 0) > 1) continue;
        if (!HABLA_DE_HORAS.test(trip.summaryEs ?? "")) continue;
        if (POR_CONFIRMAR.test(trip.importantInfo ?? "")) continue;
        if (infoDurationMinutes(trip.importantInfo) === null && !infoHalfDay(trip.importantInfo)) faltan.push(`${f}:${ref}`);
      }
    }
    expect(faltan).toEqual([]);
  });

  it("REQ-10891: SIN-01 de Turismo Asiático dice 3 h 30 min (su descripción: «unas 3 horas y media»), ya no «1 día»", () => {
    const sin01 = filas("turismoasiatico-2027.json").find((t) => t.ref === "SIN-01")!;
    expect(infoDurationMinutes(sin01.trip.importantInfo)).toBe(210);
  });
});

describe("REQ-10892: el texto del guía coincide con el idioma del tour", () => {
  it("REQ-10892: un viaje cuyo guía no habla español no promete «guía de habla hispana» ni «guía en español»", () => {
    const malos: string[] = [];
    for (const f of archivos) {
      for (const { ref, trip } of filas(f)) {
        const langs = trip.languages ?? [];
        if (!langs.length || langs.includes("es")) continue;
        for (const campo of ["summaryEs", "descriptionEs", "importantInfo"] as const) {
          for (const linea of (trip[campo] ?? "").split("\n")) {
            if (PROMETE_ESPANOL.test(linea) && !NEGADO.test(linea)) malos.push(`${f}:${ref}:${campo}`);
          }
        }
      }
    }
    expect(malos).toEqual([]);
  });

  it("REQ-10892: SIN-01 (guía en inglés) dice «guía de habla inglesa»", () => {
    const sin01 = filas("turismoasiatico-2027.json").find((t) => t.ref === "SIN-01")!;
    expect(sin01.trip.languages).toEqual(["en"]);
    expect(sin01.trip.importantInfo).toContain("guía de habla inglesa");
    expect(sin01.trip.importantInfo).not.toMatch(/habla hispana/);
  });
});
