import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dayPrice } from "./day-price";
import { leerArchivoCalendario, planCalendario, type FilaViaje } from "./calendario-carga";

/**
 * REQ-10867 (frente 4, plan REQ-3454 G5, tanda 1): el calendario de Exotic Escapes reproduce los precios públicos
 * que ya dice «Información importante» de cada viaje. Como D1 se usa el import (el 23-11-2026 D1 = import en
 * opciones y días de salida; el workflow vuelve a comprobar el precio base contra D1 antes de escribir).
 */
const calendario = leerArchivoCalendario(JSON.parse(readFileSync("imports/calendario/exoticescapes-2027.json", "utf8")));
const bundle = JSON.parse(readFileSync("imports/exoticescapes-2027.json", "utf8")) as {
  agency: { id: string; initials: string };
  trips: { ref: string; status: string; trip: { options: unknown; availability: unknown } }[];
};
const filas: FilaViaje[] = bundle.trips.map((t) => ({
  id: `${bundle.agency.initials}-${t.ref}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  status: t.status,
  options: JSON.stringify(t.trip.options),
  availability: JSON.stringify({ weekdays: [], slots: [], closedDates: [], seasons: [], ...(t.trip.availability as object) }),
}));
const plan = planCalendario(calendario, filas);
const av = (ref: string) => plan.cambios.find((c) => c.ref === ref)!.despues;
const precio = (ref: string, fecha: string, opcion: string) => {
  const o = (JSON.parse(String(filas.find((f) => f.id === `exe-${ref.toLowerCase()}`)!.options)) as { id: string; adult: number }[]).find((x) => x.id === opcion)!;
  return dayPrice(fecha, av(ref), o);
};

describe("calendario de Exotic Escapes 2027/28 (REQ-10867)", () => {
  it("REQ-10867: los 14 viajes del archivo existen en el import con el mismo precio base y todos cambian", () => {
    expect(calendario.agency).toEqual({ id: "ag-exe", initials: "EXE" });
    expect(plan.faltan).toEqual([]);
    expect(plan.cambios.map((c) => c.ref).sort()).toEqual(calendario.trips.map((t) => t.ref).sort());
    expect(plan.cambios).toHaveLength(14); // DIW26 (borrador, salida pasada) no va
  });

  it("REQ-10867: Triángulo de Oro (jueves): 594 en abril, 672 en octubre, 702 en Navidad, nada antes de abril de 2027 (G4)", () => {
    expect(precio("TO7", "2027-04-01", "a-ad")).toEqual({ status: "open", adult: 594 });
    expect(precio("TO7", "2027-10-07", "a-ad")).toEqual({ status: "open", adult: 672 });
    expect(precio("TO7", "2027-10-07", "b-pc")).toEqual({ status: "open", adult: 888 });
    expect(precio("TO7", "2027-12-23", "a-ad")).toEqual({ status: "open", adult: 702 });
    expect(precio("TO7", "2027-12-23", "b-pc")).toEqual({ status: "open", adult: 924 });
    expect(precio("TO7", "2028-01-06", "a-ad")).toEqual({ status: "open", adult: 672 });
    expect(precio("TO7", "2026-12-03", "a-ad")).toEqual({ status: "closed", adult: null });
    expect(precio("TO7", "2027-04-02", "a-ad")).toEqual({ status: "closed", adult: null }); // viernes
  });

  it("REQ-10867: Rajasthan (lunes): baja hasta el 20 de septiembre, alta desde el 27, Navidad del 20 dic al 3 ene", () => {
    expect(precio("RAJ10", "2027-09-20", "a-ad")).toEqual({ status: "open", adult: 1044 });
    expect(precio("RAJ10", "2027-09-27", "a-ad")).toEqual({ status: "open", adult: 1146 });
    expect(precio("RAJ10", "2027-12-20", "b-pc")).toEqual({ status: "open", adult: 1584 });
    expect(precio("RAJ10", "2028-01-03", "a-pc")).toEqual({ status: "open", adult: 1380 });
    expect(precio("RAJ10", "2028-01-10", "a-pc")).toEqual({ status: "open", adult: 1356 });
    expect(precio("RAJ10", "2028-03-27", "a-ad")).toEqual({ status: "open", adult: 1146 });
    expect(precio("RAJ10", "2028-04-03", "a-ad")).toEqual({ status: "closed", adult: null });
  });

  it("REQ-10867: La India entre mujeres sale solo en sus lunes anunciados", () => {
    expect(precio("MUJ8", "2027-04-05", "a")).toEqual({ status: "open", adult: 807 });
    expect(precio("MUJ8", "2027-04-12", "a")).toEqual({ status: "closed", adult: null });
    expect(precio("MUJ8", "2027-10-04", "b-ben")).toEqual({ status: "open", adult: 1769 });
    expect(av("MUJ8").closedDates).toHaveLength(27); // lunes sin salida entre el 5 abr 2027 y el 20 mar 2028
  });

  it("REQ-10867: Sri Lanka: temporada alta del 20 dic al 10 ene se suma; de mayo de 2027 en adelante «por confirmar» (G3)", () => {
    expect(precio("SRI8", "2026-12-24", "doble")).toEqual({ status: "open", adult: 1446 });
    expect(precio("SRI8", "2027-01-14", "doble")).toEqual({ status: "open", adult: 1212 });
    expect(precio("SRI8", "2027-06-03", "doble")).toEqual({ status: "quote", adult: null });
  });

  it("REQ-10867: Holi 2027 solo el 17 de marzo; las extensiones diarias suben en octubre", () => {
    expect(precio("HOLI27", "2027-03-17", "doble")).toEqual({ status: "open", adult: 850 });
    expect(precio("HOLI27", "2027-03-16", "doble")).toEqual({ status: "closed", adult: null });
    expect(precio("AMR3", "2027-10-15", "h5-pc")).toEqual({ status: "open", adult: 498 });
    expect(precio("MUM3", "2027-05-15", "h5-pc")).toEqual({ status: "open", adult: 480 });
    expect(precio("MUM3", "2027-10-15", "h5-pc")).toEqual({ status: "open", adult: 528 });
  });

  it("REQ-10867: el resumen no deja un viaje sin días ofrecidos y el precio mínimo es el «Desde» de la ficha", () => {
    for (const r of plan.resumen) {
      expect(r.diasOfrecidos, r.ref).toBeGreaterThan(0);
      const desde = Math.min(...(JSON.parse(String(filas.find((f) => f.id === r.id)!.options)) as { adult: number }[]).map((o) => o.adult));
      expect(r.precioMin, r.ref).toBe(desde);
    }
  });

  it("REQ-10867 (REQ-748): los archivos de imports/calendario/ no traen netos, comisiones ni márgenes", () => {
    const SENSITIVE = /(^net$|^neto|^net[A-Z_]|^precioNeto|commission|comisi[oó]n|^markup|^margen|^margin|^cost[oe]?$)/i;
    const keysOf = (v: unknown, out: string[] = []): string[] => {
      if (Array.isArray(v)) v.forEach((x) => keysOf(x, out));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.push(k); keysOf(x, out); }
      return out;
    };
    for (const f of readdirSync("imports/calendario").filter((x) => x.endsWith(".json"))) {
      const texto = readFileSync(`imports/calendario/${f}`, "utf8");
      expect(keysOf(JSON.parse(texto)).filter((k) => SENSITIVE.test(k)), f).toEqual([]);
      expect(texto, f).not.toMatch(/\bnet[oa]s?\b|margen|comisi/i);
    }
  });
});
