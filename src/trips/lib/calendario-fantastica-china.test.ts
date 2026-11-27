import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dayPrice } from "./day-price";
import { leerArchivoCalendario, planCalendario, type FilaViaje } from "./calendario-carga";

/**
 * REQ-10945 (frente 4, plan REQ-3454 G5, tanda 1): el calendario de Fantástica China 2027/28 parte del «desde» que ya
 * publica cada viaje (precio de la opción en D1 = import) y pone por día el precio público de su temporada, los días sin
 * salida (Año Nuevo Chino 2028) y las salidas «a consulta» del tarifario. Solo precios públicos; sin netos ni márgenes.
 * npx vitest run src/trips/lib/calendario-fantastica-china.test.ts
 */
const calendario = leerArchivoCalendario(JSON.parse(readFileSync("imports/calendario/fantasticachina-2027.json", "utf8")));
const bundle = JSON.parse(readFileSync("imports/fantasticachina-2027.json", "utf8")) as {
  agency: { id: string; initials: string };
  trips: { ref: string; status: string; trip: { options: { id: string; adult: number }[]; availability: unknown } }[];
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
  const o = bundle.trips.find((t) => t.ref === ref)!.trip.options.find((x) => x.id === opcion)!;
  return dayPrice(fecha, av(ref), o);
};

describe("calendario de Fantástica China 2027/28 (REQ-10945)", () => {
  it("REQ-10945: 43 viajes publicados, todos en el import con su mismo «desde» como base, y todos cambian; R2 queda fuera hasta que el PO decida su «desde»", () => {
    expect(calendario.agency).toEqual({ id: "ag-fch", initials: "FCH" });
    expect(plan.faltan).toEqual([]);
    expect(calendario.trips).toHaveLength(43);
    expect(plan.cambios.map((c) => c.ref).sort()).toEqual(calendario.trips.map((t) => t.ref).sort());
    const refs = calendario.trips.map((t) => t.ref);
    expect(refs).not.toContain("FCH-R2");
    for (const r of ["FCH-R17", "FCH-R18", "FCH-R19", "FCH-R20", "FCH-R21", "FCH-R22", "FCH-R23"]) expect(refs).not.toContain(r); // borradores
    for (const t of calendario.trips) {
      const pub = bundle.trips.find((b) => b.ref === t.ref)!;
      expect(pub.status, t.ref).toBe("published");
      for (const [id, base] of Object.entries(t.base)) expect(pub.trip.options.find((o) => o.id === id)?.adult, `${t.ref}/${id}`).toBe(base);
    }
  });

  it("REQ-10945: Tour Regular Básico (R1, lunes/martes/jueves): temporada de salida, Feria de Cantón en abril y octubre, sin salida en el Año Nuevo Chino", () => {
    expect(precio("FCH-R1", "2027-04-12", "v0")).toEqual({ status: "open", adult: 2676 + 84 }); // lunes, Feria de Cantón
    expect(precio("FCH-R1", "2027-05-04", "v0")).toEqual({ status: "open", adult: 2676 }); // martes, ya sin feria
    expect(precio("FCH-R1", "2027-06-10", "v0")).toEqual({ status: "open", adult: 2688 }); // jueves
    expect(precio("FCH-R1", "2027-10-14", "v0")).toEqual({ status: "open", adult: 2712 + 84 });
    expect(precio("FCH-R1", "2027-12-06", "v0")).toEqual({ status: "open", adult: 2664 }); // temporada baja = «desde»
    expect(precio("FCH-R1", "2028-01-24", "v0")).toEqual({ status: "closed", adult: null }); // Año Nuevo Chino
    expect(precio("FCH-R1", "2028-02-07", "v0")).toEqual({ status: "open", adult: 2676 });
    expect(precio("FCH-R1", "2027-04-14", "v0")).toEqual({ status: "closed", adult: null }); // miércoles
    expect(precio("FCH-R1", "2028-03-27", "v0")).toEqual({ status: "closed", adult: null }); // fuera de vigencia
  });

  it("REQ-10945: salidas diarias con suplemento fuera de lunes/martes/jueves (R4) y fuera de sábado/domingo/martes (R29); dos opciones en R8", () => {
    expect(precio("FCH-R4", "2027-03-30", "v0")).toEqual({ status: "open", adult: 552 }); // martes
    expect(precio("FCH-R4", "2027-03-31", "v0")).toEqual({ status: "open", adult: 552 + 300 }); // miércoles
    expect(precio("FCH-R29", "2027-04-03", "v0")).toEqual({ status: "open", adult: 432 }); // sábado
    expect(precio("FCH-R29", "2027-04-05", "v0")).toEqual({ status: "open", adult: 432 + 60 }); // lunes
    expect(precio("FCH-R8", "2027-09-06", "v0")).toEqual({ status: "open", adult: 1248 });
    expect(precio("FCH-R8", "2027-09-06", "v1")).toEqual({ status: "open", adult: 1074 });
    expect(precio("FCH-R8", "2027-09-05", "v1")).toEqual({ status: "open", adult: 1074 + 360 }); // domingo
  });

  it("REQ-10945: programas de temporada corta (Ruta de la Seda R12: lunes del 22 mar al 8 nov) y salidas «a consulta» por festivos (R25, 28 sep)", () => {
    expect(precio("FCH-R12", "2027-03-22", "v0")).toEqual({ status: "open", adult: 5075 });
    expect(precio("FCH-R12", "2027-09-06", "v0")).toEqual({ status: "open", adult: 5250 });
    expect(precio("FCH-R12", "2027-11-15", "v0")).toEqual({ status: "closed", adult: null });
    expect(precio("FCH-R25", "2027-09-21", "v0")).toEqual({ status: "open", adult: 3120 });
    expect(precio("FCH-R25", "2027-09-28", "v0")).toEqual({ status: "quote", adult: null });
    expect(precio("FCH-R25", "2027-10-05", "v0")).toEqual({ status: "open", adult: 3120 });
    expect(precio("FCH-R25", "2028-01-18", "v0")).toEqual({ status: "closed", adult: null });
  });

  it("REQ-10945: Gran Lujo (diario, por fecha de llegada, tres tamaños de grupo): L01 sube en primavera y verano", () => {
    expect(precio("FCH-L01", "2027-12-15", "p0")).toEqual({ status: "open", adult: 3838 });
    expect(precio("FCH-L01", "2027-06-15", "p0")).toEqual({ status: "open", adult: 4063 });
    expect(precio("FCH-L01", "2027-04-10", "p0")).toEqual({ status: "open", adult: 4125 });
    expect(precio("FCH-L01", "2027-04-10", "p2")).toEqual({ status: "open", adult: 3125 });
    expect(precio("FCH-L06", "2027-07-15", "p1")).toEqual({ status: "open", adult: 1300 });
    expect(precio("FCH-L06", "2027-05-15", "p1")).toEqual({ status: "open", adult: 1325 });
  });

  it("REQ-10945: el resumen no deja un viaje sin días ofrecidos, el precio mínimo es el «desde» y no hay ningún neto ni margen en el archivo", () => {
    for (const r of plan.resumen) {
      expect(r.diasOfrecidos, r.ref).toBeGreaterThan(0);
      const base = Math.min(...Object.values(calendario.trips.find((t) => t.ref === r.ref)!.base));
      expect(r.precioMin, r.ref).toBe(base);
    }
    const texto = readFileSync("imports/calendario/fantasticachina-2027.json", "utf8");
    expect(texto).not.toMatch(/neto|margen|markup|utilidad|comisi/i);
    expect(JSON.stringify(plan)).not.toMatch(/net|neto|margen/i);
  });
});
