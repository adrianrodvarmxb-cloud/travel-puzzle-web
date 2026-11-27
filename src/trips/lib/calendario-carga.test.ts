import { describe, expect, it } from "vitest";
import { dayPrice } from "./day-price";
import { leerArchivoCalendario, planCalendario, verificarCalendario, type FilaViaje } from "./calendario-carga";

// Fila como la devuelve D1 (options y availability vienen como texto JSON).
const fila = (id: string, options: unknown, availability: unknown, status = "published"): FilaViaje => ({
  id,
  status,
  options: JSON.stringify(options),
  availability: JSON.stringify(availability),
});

const opcionesTo7 = [
  { id: "a-ad", name: "A · AD", mode: "group", adult: 594, child: 416, infant: null, childAgeMin: 2, childAgeMax: 11 },
  { id: "b-pc", name: "B · PC", mode: "group", adult: 780, child: 546, infant: null, childAgeMin: 2, childAgeMax: 11 },
];
const d1To7 = { weekdays: [4, 6], slots: [], closedDates: [], seasons: [] };

const archivo = {
  agency: { id: "ag-exe", initials: "EXE" },
  trips: [
    {
      ref: "TO7",
      base: { "a-ad": 594, "b-pc": 780 },
      validFrom: "2027-04-01",
      validTo: "2028-03-30",
      periods: [
        {
          name: "Octubre 2027 a marzo 2028",
          from: "2027-10-01",
          to: "2028-03-31",
          except: [{ from: "2027-12-16", to: "2028-01-01" }],
          prices: { "a-ad": 672, "b-pc": 888 },
        },
        { name: "Navidad y Año Nuevo", from: "2027-12-16", to: "2028-01-01", prices: { "a-ad": 702, "b-pc": 924 } },
      ],
    },
  ],
};

describe("carga del calendario con precio por día (REQ-10866, plan REQ-3454 G5)", () => {
  it("REQ-10866: un periodo con precio público por opción se vuelve recargos que se suman al precio base (G2), partiendo de lo que hay en D1", () => {
    const plan = planCalendario(leerArchivoCalendario(archivo), [fila("exe-to7", opcionesTo7, d1To7)]);
    expect(plan.faltan).toEqual([]);
    expect(plan.cambios).toHaveLength(1);
    const av = plan.cambios[0].despues;
    expect(av.weekdays).toEqual([4, 6]); // lo de D1 se conserva
    expect(av.validFrom).toBe("2027-04-01");
    expect(av.validTo).toBe("2028-03-30");
    // El periodo se parte alrededor de la excepción: dos tramos + Navidad.
    expect(av.surcharges.map((s) => [s.name, s.from, s.to])).toEqual([
      ["Octubre 2027 a marzo 2028", "2027-10-01", "2027-12-15"],
      ["Octubre 2027 a marzo 2028", "2028-01-02", "2028-03-31"],
      ["Navidad y Año Nuevo", "2027-12-16", "2028-01-01"],
    ]);
    expect(av.surcharges[0].byOption).toEqual({ "a-ad": 78, "b-pc": 108 });
    expect(av.surcharges[2].byOption).toEqual({ "a-ad": 108, "b-pc": 144 });
    // El precio del día reproduce el precio público del tarifario.
    const aAd = { id: "a-ad", adult: 594 };
    expect(dayPrice("2027-04-01", av, aAd)).toEqual({ status: "open", adult: 594 }); // jueves, temporada base
    expect(dayPrice("2027-10-07", av, aAd)).toEqual({ status: "open", adult: 672 }); // jueves de octubre
    expect(dayPrice("2027-12-23", av, aAd)).toEqual({ status: "open", adult: 702 }); // jueves de Navidad (no se suma al de octubre)
    expect(dayPrice("2027-03-25", av, aAd)).toEqual({ status: "closed", adult: null }); // antes de la vigencia (G4)
  });

  it("REQ-10866: el SQL escribe solo availability por id y el regreso devuelve el valor anterior", () => {
    const plan = planCalendario(leerArchivoCalendario(archivo), [fila("exe-to7", opcionesTo7, d1To7)]);
    expect(plan.sql).toMatch(/^UPDATE "Trip" SET "availability" = '\{[^\n]*\}' WHERE "id" = 'exe-to7' AND "agencyId" = 'ag-exe';\n$/);
    expect(plan.sql).not.toMatch(/"status"|"options"|"priceFrom"/);
    expect(plan.regreso).toContain(`'${JSON.stringify(d1To7)}'`);
    expect(plan.regreso).toContain("WHERE \"id\" = 'exe-to7'");
  });

  it("REQ-10866: si el precio base de D1 no coincide con el del archivo, no se arma nada", () => {
    const otras = opcionesTo7.map((o) => (o.id === "a-ad" ? { ...o, adult: 600 } : o));
    expect(() => planCalendario(leerArchivoCalendario(archivo), [fila("exe-to7", otras, d1To7)])).toThrow(/a-ad.*594.*600/);
  });

  it("REQ-10866: una opción del periodo que no existe en D1 o un precio menor que el base se rechazan", () => {
    const conOpcionRara = { ...archivo, trips: [{ ...archivo.trips[0], periods: [{ name: "X", from: "2027-10-01", to: "2027-10-31", prices: { "z-zz": 700 } }] }] };
    expect(() => planCalendario(leerArchivoCalendario(conOpcionRara), [fila("exe-to7", opcionesTo7, d1To7)])).toThrow(/z-zz/);
    const menor = { ...archivo, trips: [{ ...archivo.trips[0], periods: [{ name: "X", from: "2027-10-01", to: "2027-10-31", prices: { "a-ad": 500 } }] }] };
    expect(() => planCalendario(leerArchivoCalendario(menor), [fila("exe-to7", opcionesTo7, d1To7)])).toThrow(/menor que el base/);
  });

  it("REQ-10866: con fechas de salida exactas, los demás días de salida dentro de la vigencia quedan cerrados", () => {
    const muj = {
      agency: { id: "ag-exe", initials: "EXE" },
      trips: [{ ref: "MUJ8", base: { a: 807 }, departures: ["2027-04-05", "2027-04-19", "2027-05-03"] }],
    };
    const ops = [{ id: "a", name: "A", mode: "group", adult: 807, child: null, infant: null, childAgeMin: 2, childAgeMax: 11 }];
    const plan = planCalendario(leerArchivoCalendario(muj), [fila("exe-muj8", ops, { weekdays: [1], slots: [], closedDates: [], seasons: [] })]);
    const av = plan.cambios[0].despues;
    expect(av.validFrom).toBe("2027-04-05");
    expect(av.validTo).toBe("2027-05-03");
    expect(av.closedDates).toEqual(["2027-04-12", "2027-04-26"]); // los lunes sin salida
    expect(dayPrice("2027-04-19", av, { id: "a", adult: 807 })).toEqual({ status: "open", adult: 807 });
    expect(dayPrice("2027-04-12", av, { id: "a", adult: 807 })).toEqual({ status: "closed", adult: null });
  });

  it("REQ-10866: una sola fecha sin día de la semana en D1 se ofrece solo ese día", () => {
    const holi = { agency: { id: "ag-exe", initials: "EXE" }, trips: [{ ref: "HOLI27", base: { doble: 850 }, departures: ["2027-03-17"] }] };
    const ops = [{ id: "doble", name: "Doble", mode: "group", adult: 850, child: 595, infant: null, childAgeMin: 2, childAgeMax: 11 }];
    const plan = planCalendario(leerArchivoCalendario(holi), [fila("exe-holi27", ops, { weekdays: [], slots: [], closedDates: [], seasons: [] })]);
    const av = plan.cambios[0].despues;
    expect(av.closedDates).toEqual([]);
    expect(dayPrice("2027-03-17", av, { id: "doble", adult: 850 })).toEqual({ status: "open", adult: 850 });
    expect(dayPrice("2027-03-18", av, { id: "doble", adult: 850 })).toEqual({ status: "closed", adult: null });
  });

  it("REQ-10866: recargo obligatorio con monto fijo y días «por confirmar» (G3) pasan tal cual", () => {
    const sri = {
      agency: { id: "ag-exe", initials: "EXE" },
      trips: [{
        ref: "SRI8", base: { doble: 1212 }, validFrom: "2026-12-01", validTo: "2028-03-31",
        surcharges: [{ name: "Temporada alta", from: "2026-12-20", to: "2027-01-10", amount: 234 }],
        quoteRanges: [{ from: "2027-05-01", to: "2028-03-31" }],
      }],
    };
    const ops = [{ id: "doble", name: "Doble", mode: "group", adult: 1212, child: null, infant: null, childAgeMin: 2, childAgeMax: 11 }];
    const plan = planCalendario(leerArchivoCalendario(sri), [fila("exe-sri8", ops, { weekdays: [4], slots: [], closedDates: [], seasons: [] })]);
    const av = plan.cambios[0].despues;
    expect(dayPrice("2026-12-24", av, { id: "doble", adult: 1212 })).toEqual({ status: "open", adult: 1446 });
    expect(dayPrice("2027-02-04", av, { id: "doble", adult: 1212 })).toEqual({ status: "open", adult: 1212 });
    expect(dayPrice("2027-06-03", av, { id: "doble", adult: 1212 })).toEqual({ status: "quote", adult: null });
  });

  it("REQ-10866: un viaje del archivo que no está en D1 no se toca y se reporta; uno igual que ya tiene lo mismo no cambia", () => {
    const plan = planCalendario(leerArchivoCalendario(archivo), []);
    expect(plan.faltan).toEqual(["exe-to7"]);
    expect(plan.cambios).toEqual([]);
    expect(plan.sql).toBe("");
    const ya = planCalendario(leerArchivoCalendario(archivo), [fila("exe-to7", opcionesTo7, d1To7)]);
    const otraVez = planCalendario(leerArchivoCalendario(archivo), [fila("exe-to7", opcionesTo7, ya.cambios[0].despues)]);
    expect(otraVez.cambios).toEqual([]);
  });

  it("REQ-10866: el resumen por viaje cuenta días ofrecidos y precio público mínimo y máximo, sin ningún neto", () => {
    const plan = planCalendario(leerArchivoCalendario(archivo), [fila("exe-to7", opcionesTo7, d1To7)]);
    const r = plan.resumen[0];
    expect(r.id).toBe("exe-to7");
    expect(r.diasOfrecidos).toBeGreaterThan(90); // jueves y sábados de un año
    expect(r.precioMin).toBe(594);
    expect(r.precioMax).toBe(702);
    expect(JSON.stringify(plan)).not.toMatch(/net|neto|margen/i);
  });

  it("REQ-10866: la verificación compara lo escrito con el plan", () => {
    const plan = planCalendario(leerArchivoCalendario(archivo), [fila("exe-to7", opcionesTo7, d1To7)]);
    const bien = verificarCalendario(plan, [{ id: "exe-to7", availability: JSON.stringify(plan.cambios[0].despues) }]);
    expect(bien).toEqual({ ok: true, mal: [] });
    const mal = verificarCalendario(plan, [{ id: "exe-to7", availability: JSON.stringify(d1To7) }]);
    expect(mal).toEqual({ ok: false, mal: ["exe-to7"] });
  });

  it("REQ-10866: el archivo se valida (ref repetida, fechas al revés)", () => {
    expect(() => leerArchivoCalendario({ ...archivo, trips: [archivo.trips[0], archivo.trips[0]] })).toThrow(/repetid/);
    expect(() => leerArchivoCalendario({ ...archivo, trips: [{ ...archivo.trips[0], validFrom: "2028-01-01", validTo: "2027-01-01" }] })).toThrow();
  });
});
