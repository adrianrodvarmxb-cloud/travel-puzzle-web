import { describe, expect, it, vi, afterEach } from "vitest";
import { practicalInfo, whiteLabelText, whiteLabelList, freeCancellation, departureTimes, ageRange } from "./practical-info";

afterEach(() => vi.restoreAllMocks());

/** Traductor de prueba: devuelve la llave para ver qué etiqueta eligió la función (el real usa src/lib/translations). */
const tr = (k: string) => ({ "tours.agesRange": "{from} a {to} años" } as Record<string, string>)[k] ?? k;
const opts = { lang: "es", tr };

/** Fila de "Tour" como la devuelve D1 (JSON como texto, edades como INTEGER). */
const fila = (over: Record<string, unknown> = {}) => ({
  providerId: "tangol",
  guideLanguages: '["es","en"]',
  excludes: '["Propinas","Comidas"]',
  cancellationPolicy: "Cancelación sin cargo hasta 24 h antes.",
  availabilityRules: JSON.stringify({
    options: [
      { code: "AM", startTime: "09:00", operationDays: [1], operationDaysRaw: null, hoursBooking: 24, hoursCancelation: 24 },
      { code: "PM", startTime: "14:30:00", operationDays: [1], operationDaysRaw: null, hoursBooking: 24, hoursCancelation: 48 },
    ],
    validity: [], blackouts: [],
  }),
  endPoint: "Plaza de Mayo",
  whatToBring: "Calzado cómodo.",
  physicalRequirements: "Caminar 2 km.",
  difficulty: "Baja",
  providerNotes: "Sale con lluvia.",
  childAgeFrom: 3, childAgeTo: 11, infantAgeFrom: 0, infantAgeTo: 2,
  ...over,
});
const vacia = {
  providerId: "tangol", guideLanguages: "[]", excludes: null, cancellationPolicy: null, availabilityRules: null, endPoint: null, whatToBring: null,
  physicalRequirements: null, difficulty: null, providerNotes: null, childAgeFrom: null, childAgeTo: null, infantAgeFrom: null, infantAgeTo: null,
};
const fact = (v: ReturnType<typeof practicalInfo>, k: string) => v.facts.find((f) => f.key === k);

describe("REQ-10536: bloque Condiciones (no incluye, cancelación, horas para cancelar sin cargo)", () => {
  it("REQ-10536: arma qué no incluye, la política y las horas sin cargo desde la fila", () => {
    const v = practicalInfo(fila(), opts);
    expect(v.conditions).toEqual({
      excludes: ["Propinas", "Comidas"],
      cancellationPolicy: "Cancelación sin cargo hasta 24 h antes.",
      freeCancellation: { hours: 24, varies: true },
    });
  });

  it("REQ-10536: si todas las opciones piden lo mismo, no dice «según la opción»", () => {
    expect(freeCancellation({ options: [{ hoursCancelation: 48 }, { hoursCancelation: 48 }] })).toEqual({ hours: 48, varies: false });
  });

  it("REQ-10536: opciones distintas → el mínimo, marcado como variable (texto honesto)", () => {
    expect(freeCancellation({ options: [{ hoursCancelation: 72 }, { hoursCancelation: 24 }, { hoursCancelation: null }] })).toEqual({ hours: 24, varies: true });
  });

  it("REQ-10536: sin horas (null, 0 o negativas) no se promete cancelación sin cargo", () => {
    expect(freeCancellation({ options: [{ hoursCancelation: null }, { hoursCancelation: 0 }] })).toBeNull();
    expect(freeCancellation(null)).toBeNull();
    expect(freeCancellation({ options: "x" })).toBeNull();
  });

  it("REQ-10536: sin ningún dato el bloque no aparece (null)", () => {
    expect(practicalInfo(vacia, opts).conditions).toBeNull();
    expect(practicalInfo(fila({ excludes: "[]", cancellationPolicy: "  ", availabilityRules: null }), opts).conditions).toBeNull();
  });

  it("REQ-10536: con solo un dato el bloque aparece con ese dato y nada más", () => {
    expect(practicalInfo({ ...vacia, excludes: '["Propinas"]' }, opts).conditions).toEqual({ excludes: ["Propinas"], cancellationPolicy: null, freeCancellation: null });
  });

  it("REQ-10536: un JSON roto o con otra forma se descarta y se registra; la ficha sigue", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const v = practicalInfo(fila({ excludes: "{no es json", availabilityRules: '{"options":5}' }), opts);
    expect(v.conditions).toEqual({ excludes: [], cancellationPolicy: "Cancelación sin cargo hasta 24 h antes.", freeCancellation: null });
    expect(v.discarded).toBe(2);
    expect(warn).toHaveBeenCalled();
  });

  it("REQ-10536: una fila que no es objeto devuelve todo vacío, sin lanzar", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(practicalInfo(null, opts)).toEqual({ conditions: null, beforeYouGo: null, facts: [], discarded: 0 });
    expect(practicalInfo("x", opts)).toMatchObject({ conditions: null, beforeYouGo: null, facts: [] });
  });
});

describe("REQ-10537: bloque Antes de ir (qué llevar, requisitos físicos, dificultad, notas)", () => {
  it("REQ-10537: cada dato presente entra en orden fijo", () => {
    expect(practicalInfo(fila(), opts).beforeYouGo).toEqual({
      items: [
        { key: "whatToBring", text: "Calzado cómodo." },
        { key: "physicalRequirements", text: "Caminar 2 km." },
        { key: "difficulty", text: "Baja" },
        { key: "providerNotes", text: "Sale con lluvia." },
      ],
    });
  });

  it("REQ-10537: solo los que tienen dato; sin ninguno, el bloque no aparece", () => {
    expect(practicalInfo({ ...vacia, difficulty: "Media" }, opts).beforeYouGo).toEqual({ items: [{ key: "difficulty", text: "Media" }] });
    expect(practicalInfo(vacia, opts).beforeYouGo).toBeNull();
    expect(practicalInfo({ ...vacia, whatToBring: "   ", difficulty: 7 }, opts).beforeYouGo).toBeNull();
  });

  it("REQ-10537: es genérico (gate B): un tour de otro proveedor con el dato también lo muestra", () => {
    expect(practicalInfo({ ...vacia, providerId: "otro", whatToBring: "Agua" }, opts).beforeYouGo).toEqual({ items: [{ key: "whatToBring", text: "Agua" }] });
  });
});

describe("REQ-10538: detalles prácticos para la franja (horario de salida, punto de término, edades)", () => {
  it("REQ-10538: horarios de salida distintos, en HH:MM y ordenados; etiqueta en plural si hay varios", () => {
    const v = practicalInfo(fila(), opts);
    expect(fact(v, "horario-salida")).toEqual({ key: "horario-salida", label: "tours.departureTimes", value: "09:00, 14:30", clientOnly: false });
    const uno = practicalInfo(fila({ availabilityRules: JSON.stringify({ options: [{ startTime: "9:00" }, { startTime: "09:00" }] }) }), opts);
    expect(fact(uno, "horario-salida")).toMatchObject({ label: "tours.departureTime", value: "09:00" });
  });

  it("REQ-10538: más de 4 horarios se resumen con «+N»; horas inválidas se ignoran", () => {
    expect(departureTimes({ options: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "25:00", null, "x"].map((startTime) => ({ startTime })) })).toEqual(["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]);
    const v = practicalInfo(fila({ availabilityRules: JSON.stringify({ options: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((startTime) => ({ startTime })) }) }), opts);
    expect(fact(v, "horario-salida")?.value).toBe("08:00, 10:00, 12:00, 14:00 +2");
  });

  it("REQ-10538: punto de término y edades de niño e infante con su texto", () => {
    const v = practicalInfo(fila(), opts);
    expect(fact(v, "punto-termino")).toMatchObject({ label: "tours.endPoint", value: "Plaza de Mayo" });
    expect(fact(v, "edad-ninos")).toMatchObject({ label: "tours.childAges", value: "3 a 11 años" });
    expect(fact(v, "edad-infantes")).toMatchObject({ label: "tours.infantAges", value: "0 a 2 años" });
  });

  it("REQ-10538: edades 0–0, al revés o no enteras no se pintan", () => {
    expect(ageRange(0, 0)).toBeNull();
    expect(ageRange(12, 4)).toBeNull();
    expect(ageRange(1.5, 4)).toBeNull();
    expect(ageRange("3", 11)).toBeNull();
    expect(ageRange(3, 11)).toEqual({ from: 3, to: 11 });
    const v = practicalInfo(fila({ childAgeFrom: 0, childAgeTo: 0, infantAgeFrom: 5, infantAgeTo: 1 }), opts);
    expect(fact(v, "edad-ninos")).toBeUndefined();
    expect(fact(v, "edad-infantes")).toBeUndefined();
  });

  it("REQ-10538: sin datos no hay hechos (ninguna casilla vacía)", () => {
    expect(practicalInfo(vacia, opts).facts).toEqual([]);
    for (const f of practicalInfo(fila(), opts).facts) expect(f.value.trim()).not.toBe("");
  });
});

describe("REQ-10539: idiomas del guía en la franja", () => {
  it("REQ-10539: códigos ISO guardados → nombres en el idioma de la página, calculados en el servidor", () => {
    expect(fact(practicalInfo(fila(), opts), "idioma-guia")).toEqual({ key: "idioma-guia", label: "tours.guideLanguage", value: "Español, Inglés", clientOnly: false });
    expect(fact(practicalInfo(fila(), { lang: "en", tr }), "idioma-guia")?.value).toBe("Spanish, English");
  });

  it("REQ-10539: sin idiomas no hay casilla; en FREETOUR (sin enriquecimiento) va solo en el cliente, como REQ-588", () => {
    expect(fact(practicalInfo(vacia, opts), "idioma-guia")).toBeUndefined();
    expect(fact(practicalInfo(fila({ providerId: "freetour", guideLanguages: '["en","sp"]' }), opts), "idioma-guia")).toMatchObject({ value: "Inglés, Español", clientOnly: true });
  });
});

describe("REQ-10540: marca blanca en los textos nuevos (URLs, dominios, teléfonos y correos del proveedor)", () => {
  it("REQ-10540: se cae la frase con URL, dominio, correo o teléfono; el resto queda", () => {
    expect(whiteLabelText("Lleve agua. Más info en https://www.tangol.com/ar/tour. Use calzado cómodo.")).toBe("Lleve agua. Use calzado cómodo.");
    expect(whiteLabelText("Reserva en tangol.com o en www.otro.com.ar. Sin cargo hasta 24 h.")).toBe("Sin cargo hasta 24 h.");
    expect(whiteLabelText("Escriba a reservas@tangol.com. Llegue 15 min antes.")).toBe("Llegue 15 min antes.");
    expect(whiteLabelText("Llame al +54 11 4363-6000 para cambios.\nSale con lluvia.")).toBe("Sale con lluvia.");
    expect(whiteLabelText("WhatsApp (011) 15 5555 1234")).toBeNull();
  });

  it("REQ-10540: no confunde horarios, fechas, edades ni cantidades con teléfonos", () => {
    const t = "Salida 09:00 - 13:00. Vigente desde 2026-11-13. Niños de 3 a 11 años. Caminata de 1.500 m. Sin cargo hasta 48 hs.";
    expect(whiteLabelText(t)).toBe(t);
  });

  it("REQ-10540 / REQ-10542: el nombre del operador NO se borra (solo contactos y enlaces)", () => {
    expect(whiteLabelText("Opera Tangol Tours en destino.")).toBe("Opera Tangol Tours en destino.");
  });

  it("REQ-10540: «tel.» o «Av.» no parten la frase: no queda «tel.» suelto", () => {
    expect(whiteLabelText("Lleve agua. Cambios al tel. 11 4363 6000. Sale con lluvia.")).toBe("Lleve agua. Sale con lluvia.");
    expect(whiteLabelText("Salida desde Av. Corrientes 1234.")).toBe("Salida desde Av. Corrientes 1234.");
  });

  it("REQ-10540: en listas se descarta el renglón con contacto", () => {
    expect(whiteLabelList(["Propinas", "Traslado: llamar al 11 5555 1234", "Fotos en tangol.com", " ", "Comidas"])).toEqual(["Propinas", "Comidas"]);
  });

  it("REQ-10540: ningún bloque ni hecho armado sale con URL, dominio, teléfono o correo del proveedor", () => {
    const sucia = fila({
      excludes: '["Propinas","Ver www.tangol.com"]',
      cancellationPolicy: "Hasta 24 h sin cargo. Dudas: info@tangol.com",
      endPoint: "Oficina, tel. 11 4363 6000",
      whatToBring: "Agua. Lista completa en https://tangol.com/x",
      physicalRequirements: "Llame al +54 9 11 5555 1234.",
      difficulty: "Baja (tangol.com.ar)",
      providerNotes: "Notas en http://bit.ly/abc. Sale con lluvia.",
    });
    const v = practicalInfo(sucia, opts);
    const todo = JSON.stringify(v);
    expect(todo).not.toMatch(/https?:|www\.|\.com|@|\d{4}[\s-]?\d{4}/i);
    expect(v.conditions?.excludes).toEqual(["Propinas"]);
    expect(v.conditions?.cancellationPolicy).toBe("Hasta 24 h sin cargo.");
    expect(fact(v, "punto-termino")).toBeUndefined();
    expect(v.beforeYouGo?.items).toEqual([{ key: "whatToBring", text: "Agua." }, { key: "providerNotes", text: "Sale con lluvia." }]);
  });
});
