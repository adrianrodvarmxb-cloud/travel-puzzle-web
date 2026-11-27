import { describe, expect, it } from "vitest";
import { abiertas, cerrar, espaciarPorContacto, leerPreguntas, textoRecordatorio, type Pregunta } from "./preguntas";

const p = (id: string, tema: Pregunta["tema"], es: string, en: string, extra: Partial<Pregunta> = {}): Pregunta => ({
  id, tema, es, en, req: null, desde: "2026-11-10", cerrada: null, ...extra,
});

const jordan: Pregunta[] = [
  p("ninos", "tarifas", "Precio y edades de niños.", "Child price and ages.", { desde: "2026-11-11" }),
  p("gala", "tarifas", "Cena de gala del 31 de diciembre.", "Gala dinner on 31 December.", { desde: "2026-11-11" }),
  p("eid", "calendario", "Año de las fechas del Eid.", "Year of the Eid dates.", { req: "REQ-1395" }),
  p("factura", "pago", "Plazo y moneda de la factura.", "Invoice term and currency."),
  p("cambio", "cancelacion", "Cuánto cuesta un cambio.", "Cost of a change."),
  p("legal", "alta", "Datos legales de la empresa.", "Company legal details."),
  p("vieja", "tarifas", "Ya contestada.", "Already answered.", { cerrada: "2026-11-12" }),
];

describe("preguntas por proveedor (REQ-10648)", () => {
  it("REQ-10648: solo salen las abiertas, en el orden en que se abrieron", () => {
    const ids = abiertas(jordan).map((q) => q.id);
    expect(ids).not.toContain("vieja");
    expect(ids.slice(0, 4)).toEqual(["eid", "factura", "cambio", "legal"]);
  });

  it("REQ-10648 (G3-A): cerrar marca la fecha y conserva el historial; un id desconocido no cambia nada", () => {
    const tras = cerrar(jordan, "eid", "2026-11-14");
    expect(tras).toHaveLength(jordan.length);
    expect(tras.find((q) => q.id === "eid")?.cerrada).toBe("2026-11-14");
    expect(abiertas(tras).map((q) => q.id)).not.toContain("eid");
    expect(cerrar(jordan, "no-existe", "2026-11-14")).toEqual(jordan);
    expect(cerrar(jordan, "vieja", "2026-11-14").find((q) => q.id === "vieja")?.cerrada).toBe("2026-11-12");
  });

  it("REQ-10648: el recordatorio va en el idioma del proveedor, un punto por tema y máximo 5 arriba", () => {
    const en = textoRecordatorio({ preguntas: jordan, idioma: "en", alta: ["Photos we may publish."] });
    expect(en.arriba).toHaveLength(4);
    expect(en.arriba[0]).toBe("Rates: Child price and ages; Gala dinner on 31 December.");
    expect(en.arriba[1]).toBe("Calendar: Year of the Eid dates.");
    expect(en.arriba.join(" ")).not.toMatch(/niños|Cena/);
    expect(en.arriba.length).toBeLessThanOrEqual(5);
    const es = textoRecordatorio({ preguntas: jordan, idioma: "es", alta: [] });
    expect(es.arriba[3]).toBe("Cancelación: Cuánto cuesta un cambio.");
  });

  it("REQ-10648: «Para cerrar el alta» lleva las de alta propias y la lista genérica, en 2 o 3 líneas", () => {
    const r = textoRecordatorio({ preguntas: jordan, idioma: "es", alta: ["Fotos que podemos publicar.", "Datos del viajero.", "Otra más.", "Y otra."] });
    expect(r.cierre).toHaveLength(3);
    expect(r.cierre[0]).toBe("Datos legales de la empresa.");
    expect(r.cierre[1]).toBe("Fotos que podemos publicar.");
  });

  it("REQ-10648 (LSP): sin preguntas propias, el recordatorio sale igual que hoy: solo la lista de alta", () => {
    const r = textoRecordatorio({ preguntas: [], idioma: "es", alta: ["Tarifario vigente.", "Cancelación."] });
    expect(r.arriba).toEqual([]);
    expect(r.cierre).toEqual(["Tarifario vigente.", "Cancelación."]);
  });

  it("REQ-10648 (G4-A): una persona con varios proveedores recibe un solo correo con un apartado por proveedor", () => {
    const correos = espaciarPorContacto(
      [
        { proveedorId: "exotic", contacto: "Angela@Ejemplo.com", ultimoCorreoAlContacto: "2026-11-10" },
        { proveedorId: "jordan", contacto: "angela@ejemplo.com ", ultimoCorreoAlContacto: null },
        { proveedorId: "multitravel", contacto: "angela@ejemplo.com", ultimoCorreoAlContacto: "2026-11-12" },
        { proveedorId: "china", contacto: "ventas@china.ejemplo", ultimoCorreoAlContacto: null },
      ],
      "2026-11-14",
    );
    expect(correos).toHaveLength(2);
    expect(correos[0].proveedores).toEqual(["exotic", "jordan", "multitravel"]);
    expect(correos[1]).toEqual({ contacto: "ventas@china.ejemplo", proveedores: ["china"] });
  });

  it("REQ-10648 (G4-A): no más de un correo al día a la misma persona", () => {
    const correos = espaciarPorContacto(
      [
        { proveedorId: "exotic", contacto: "angela@ejemplo.com", ultimoCorreoAlContacto: "2026-11-14" },
        { proveedorId: "jordan", contacto: "angela@ejemplo.com", ultimoCorreoAlContacto: null },
        { proveedorId: "china", contacto: "ventas@china.ejemplo", ultimoCorreoAlContacto: "2026-11-13" },
      ],
      "2026-11-14",
    );
    expect(correos.map((c) => c.contacto)).toEqual(["ventas@china.ejemplo"]);
  });

  it("REQ-10648: la columna JSON se lee con tolerancia; un registro malo se descarta y no tumba nada", () => {
    expect(leerPreguntas(null)).toEqual([]);
    expect(leerPreguntas("no es json")).toEqual([]);
    expect(leerPreguntas('{"a":1}')).toEqual([]);
    const buenas = leerPreguntas(JSON.stringify([jordan[0], { id: "", tema: "tarifas" }, { id: "x", tema: "otro", es: "", en: "", desde: "2026-11-01", cerrada: null, req: null }, 7]));
    expect(buenas).toEqual([jordan[0]]);
  });
});

// REQ-10811 (plan REQ-3457 §2 y G3-A, PO 12 nov 2026): Mila lee la respuesta y PROPONE qué preguntas parecen contestadas; nadie las cierra solo.
import { proponerCierres, textoPropuestaCierre } from "./preguntas";

describe("propuesta de cierre tras una respuesta (REQ-10811, G3-A)", () => {
  it("REQ-10811: una respuesta que habla de una pregunta la propone como contestada; las demás siguen abiertas", () => {
    const r = proponerCierres(jordan, "Hola Mila, el precio de niños es 50 % de 2 a 11 años. La cena de gala del 31 de diciembre es opcional y se cobra aparte.");
    expect(r.contestadas.map((q) => q.id).sort()).toEqual(["gala", "ninos"]);
    expect(r.abiertas.map((q) => q.id)).toEqual(["eid", "factura", "cambio", "legal"]);
  });

  it("REQ-10811 (G3-A): un «sí» suelto, un texto vacío o un adjunto sin texto no cierran nada", () => {
    expect(proponerCierres(jordan, "Sí").contestadas).toEqual([]);
    expect(proponerCierres(jordan, "").contestadas).toEqual([]);
    expect(proponerCierres(jordan, "Adjunto el PDF. Saludos.").contestadas).toEqual([]);
    expect(proponerCierres(jordan, "Sí").abiertas).toHaveLength(6);
  });

  it("REQ-10811: lee la respuesta en inglés contra el texto en inglés de la pregunta, y las cerradas no se proponen", () => {
    const r = proponerCierres(jordan, "The Eid dates are for 2027. Invoice term is 30 days and the currency is USD.");
    expect(r.contestadas.map((q) => q.id).sort()).toEqual(["eid", "factura"]);
    expect(r.contestadas.map((q) => q.id)).not.toContain("vieja");
  });

  it("REQ-10811: proponer no cambia las preguntas (nada queda cerrado)", () => {
    const antes = JSON.stringify(jordan);
    proponerCierres(jordan, "Child price and ages: 50 %.");
    expect(JSON.stringify(jordan)).toBe(antes);
    expect(abiertas(jordan)).toHaveLength(6);
  });

  it("REQ-10811: el aviso al PO va en español, nombra al proveedor, lista lo que parece contestado y lo abierto, y dice que nadie cierra solo", () => {
    const t = textoPropuestaCierre({ proveedor: "Jordan Experience", asunto: "Re: Travel Puzzle", propuesta: proponerCierres(jordan, "Child price and ages: 50 % from 2 to 11.") });
    expect(t).toContain("Jordan Experience");
    expect(t).toContain("Parecen contestadas");
    expect(t).toContain("Precio y edades de niños");
    expect(t).toContain("Siguen abiertas");
    expect(t).toContain("Año de las fechas del Eid");
    expect(t).toMatch(/nadie las cierra sol[oa]|no se cierra sola/i);
    expect(t).not.toContain("Child price");
  });

  it("REQ-10811: sin nada que parezca contestado, el aviso lo dice y conserva la lista abierta", () => {
    const t = textoPropuestaCierre({ proveedor: "Jordan Experience", asunto: "Re: hola", propuesta: proponerCierres(jordan, "Gracias, lo reviso.") });
    expect(t).toContain("Ninguna parece contestada");
    expect(t).toContain("Siguen abiertas");
  });
});
