// REQ-1291..1296: Mila administra proveedores (gates en docs/gates-proveedores-mila-2026-11.md).
import { describe, it, expect } from "vitest";
import { aplicarEvento, type EstadoProveedor } from "./etapas";
import { diasHabiles, siguienteAccion } from "./seguimiento";
import { tandaDelDia } from "./tandas";
import { proveedorDeCorreo } from "./identificar";
import { armarCorreo, rellenar, COPIAS } from "./correo";
import { rutaDocumento, rutaPrivada } from "./documentos";

const nuevo: EstadoProveedor = { etapa: "por_contactar", recordatorios: 0 };

describe("REQ-1291: etapas y último mensaje de cada lado", () => {
  it("REQ-1291: enviar, contestar, aceptar y quedar activo", () => {
    let s = aplicarEvento(nuevo, "enviamos", "2026-11-09T10:00:00Z");
    expect(s).toMatchObject({ etapa: "contactado", ultimoNuestro: "2026-11-09T10:00:00Z" });
    s = aplicarEvento(s, "contestaron", "2026-11-10T09:00:00Z");
    expect(s).toMatchObject({ etapa: "respondio", ultimoSuyo: "2026-11-10T09:00:00Z", recordatorios: 0 });
    s = aplicarEvento(s, "acepto", "2026-11-10T09:00:00Z");
    expect(s.etapa).toBe("en_alta");
    expect(aplicarEvento(s, "listo", "2026-11-12").etapa).toBe("activo");
  });
  it("REQ-1291: un correo nuestro a un proveedor activo no lo regresa de etapa", () => {
    expect(aplicarEvento({ ...nuevo, etapa: "activo" }, "enviamos", "2026-11-09").etapa).toBe("activo");
  });
  it("REQ-1291: el correo de un proveedor identifica a quién pertenece (dirección exacta o dominio; nunca internos ni FREETOUR)", () => {
    const provs = [
      { id: "inca", correos: ["centralincaworldtravel@gmail.com"], dominios: [] },
      { id: "destino-colombia", correos: [], dominios: ["destinocolombia.com"] },
    ];
    expect(proveedorDeCorreo(["claulet@travelpuzzle.com.mx", "reservas5@destinocolombia.com"], provs)).toBe("destino-colombia");
    expect(proveedorDeCorreo(["CentralIncaWorldTravel@gmail.com"], provs)).toBe("inca");
    expect(proveedorDeCorreo(["otro@gmail.com"], provs)).toBeNull();
    expect(proveedorDeCorreo(["i.merino@freetour.com", "reservas5@destinocolombia.com"], provs)).toBeNull();
  });
});

describe("REQ-1293: seguimiento diario y tandas", () => {
  it("REQ-1293: cuenta días hábiles sin fines de semana", () => {
    expect(diasHabiles("2026-11-06", "2026-11-13")).toBe(5); // viernes a viernes
  });
  it("REQ-1293: recordatorios a los 5 y 10 días hábiles; después, «sin respuesta»; reintento a los 2 meses", () => {
    const enviado = aplicarEvento(nuevo, "enviamos", "2026-11-09T10:00:00Z"); // lunes
    expect(siguienteAccion(enviado, "2026-11-13")).toBeNull();
    expect(siguienteAccion(enviado, "2026-11-16")).toBe("recordatorio");
    const r1 = aplicarEvento(enviado, "enviamos", "2026-11-16T10:00:00Z", true);
    expect(siguienteAccion(r1, "2026-11-23")).toBe("recordatorio");
    const r2 = aplicarEvento(r1, "enviamos", "2026-11-23T10:00:00Z", true);
    expect(siguienteAccion(r2, "2026-11-30")).toBe("marcar_sin_respuesta");
    const sr = aplicarEvento(r2, "sin_respuesta", "2026-11-30");
    expect(sr.etapa).toBe("sin_respuesta");
    expect(siguienteAccion(sr, "2027-01-29")).toBeNull();
    expect(siguienteAccion(sr, "2027-01-30")).toBe("reintento");
  });
  it("REQ-1293: si contestaron, no hay recordatorio", () => {
    const s = aplicarEvento(aplicarEvento(nuevo, "enviamos", "2026-11-09T10:00:00Z"), "contestaron", "2026-11-10T10:00:00Z");
    expect(siguienteAccion(s, "2026-11-30")).toBeNull();
  });
  it("REQ-1293: tanda de 20 al día, primero los publicados, sin bloqueados", () => {
    const lista = [
      ...Array.from({ length: 25 }, (_, i) => ({ id: `n${String(i).padStart(2, "0")}`, publicado: false, etapa: "por_contactar" })),
      { id: "zz-publicado", publicado: true, etapa: "por_contactar" },
      { id: "freetour", publicado: true, etapa: "por_contactar", bloqueado: true },
      { id: "ya", publicado: true, etapa: "contactado" },
    ];
    const t = tandaDelDia(lista);
    expect(t).toHaveLength(20);
    expect(t[0]).toBe("zz-publicado");
    expect(t).not.toContain("freetour");
    expect(t).not.toContain("ya");
  });
});

describe("REQ-1294: el correo de Mila", () => {
  it("REQ-1294: sale de comercial@, con copia a Claudia y Adrián, firmado «Mila, del equipo de Travel Puzzle»", () => {
    const c = armarCorreo({ para: ["reservas5@destinocolombia.com"], asunto: "Travel Puzzle · prueba", cuerpo: "Hola" })!;
    expect(c.from).toContain("comercial@travelpuzzle.com.mx");
    expect(c.cc).toEqual(COPIAS);
    expect(c.text).toContain("Del equipo de Travel Puzzle");
  });
  it("REQ-1294: nunca a FREETOUR ni con campos sin llenar en el asunto", () => {
    expect(armarCorreo({ para: ["i.merino@freetour.com"], asunto: "x", cuerpo: "y" })).toBeNull();
    expect(armarCorreo({ para: ["a@b.com"], asunto: "Hola {nombre}", cuerpo: "y" })).toBeNull();
  });
  it("REQ-1294: una línea con un dato faltante no sale; no se inventa", () => {
    const t = rellenar("Hola, {nombre}:\nGracias por {ultimo_tema}.\nQuedo atenta.", { nombre: "Lina" });
    expect(t).toBe("Hola, Lina:\nQuedo atenta.");
  });
});

describe("REQ-1295: alta del proveedor que acepta", () => {
  it("REQ-1295: «acepto» lo pasa a en_alta aunque viniera de sin_respuesta", () => {
    expect(aplicarEvento({ ...nuevo, etapa: "sin_respuesta" }, "acepto", "2026-12-01").etapa).toBe("en_alta");
  });
});

describe("REQ-1296: documentos en cPanel, fuera de public_html", () => {
  it("REQ-1296: arma la ruta por proveedor y fecha, con nombre limpio", () => {
    expect(rutaDocumento("destino-colombia", "2026-11-05T15:03:35Z", "PC 017 - Colombia Herencia (8N).pdf"))
      .toBe("proveedores-docs/destino-colombia/2026-11-05/pc-017-colombia-herencia-8n.pdf");
    expect(rutaDocumento("x", "2026-11-05", "tarifario.pptx")).toBe("proveedores-docs/x/2026-11-05/tarifario.pptx");
  });
  it("REQ-1296: rechaza ejecutables y rutas que salen de la carpeta privada", () => {
    expect(rutaDocumento("x", "2026-11-05", "virus.exe")).toBeNull();
    expect(rutaDocumento("x", "2026-11-05", "../../public_html/a.pdf")).toBe("proveedores-docs/x/2026-11-05/a.pdf");
    expect(rutaPrivada("proveedores-docs/x/2026-11-05/a.pdf")).toBe(true);
    expect(rutaPrivada("public_html/proveedores-docs/a.pdf")).toBe(false);
    expect(rutaPrivada("proveedores-docs/../public_html/a.pdf")).toBe(false);
  });
});

import { plantilla } from "./plantillas";
describe("REQ-1294: plantillas", () => {
  it("REQ-1297: presentación a un proveedor nuevo, sin nombre: saludo genérico, en voz de Adrián y sin «gracias por»", () => {
    const p = plantilla("presentacion", "es", { proveedor: "Tangol", destinos: "Argentina" });
    const t = rellenar(p.cuerpo, { proveedor: "Tangol", destinos: "Argentina" });
    expect(t.startsWith("Hola:\nLes saluda Adrián, de Travel Puzzle. Les presento a Mila")).toBe(true);
    expect(t).not.toContain("Gracias por");
    expect(t).toContain("nos interesa sumar su operación en Argentina");
  });
  it("REQ-1294: presentación a un proveedor con relación: «gracias por…» y sin «somos una agencia»", () => {
    const d = { contacto: "Lina", proveedor: "Destino Colombia", ultimo_tema: "los términos y condiciones" };
    const t = rellenar(plantilla("presentacion", "es", d).cuerpo, d);
    expect(t.startsWith("Hola, Lina:")).toBe(true);
    expect(t).toContain("Gracias por los términos y condiciones.");
    expect(t).not.toContain("Somos una agencia");
  });
});

import { pedidosDeIntegracion, pedidosDeCobro } from "./integracion";
import { borradorPresentacion } from "./borrador";
describe("REQ-1298/REQ-1299: integración por prioridad y cobro", () => {
  it("REQ-1298: sin datos pide API, plugin, portal y manual en ese orden; con portal solo pide lo mejor que el portal; con API nada", () => {
    const todo = pedidosDeIntegracion("desconocida");
    expect(todo).toHaveLength(4);
    expect(todo[0]).toMatch(/API/);
    expect(todo[1]).toMatch(/plugin, widget/);
    expect(todo[2]).toMatch(/usuario para Mila/);
    expect(todo[3]).toMatch(/con quién nos dirigimos.*cuánto tiempo/);
    expect(pedidosDeIntegracion("portal")).toHaveLength(2);
    expect(pedidosDeIntegracion("api")).toEqual([]);
    expect(pedidosDeIntegracion("manual")[3]).toMatch(/cuánto tiempo/);
  });
  it("REQ-1299: primero que cobre el proveedor (liga de pago) y solo después la cuenta bancaria", () => {
    const c = pedidosDeCobro("desconocido");
    expect(c[0]).toMatch(/ustedes cobren directo.*liga de pago/);
    expect(c[1]).toMatch(/datos bancarios/);
    expect(pedidosDeCobro("proveedor")).toEqual([]);
  });
  it("REQ-1297: el borrador va a nombre de Adrián, con copia a Mila y a Claudia, con los pedidos numerados", () => {
    const b = borradorPresentacion({ nombre: "Inca World Peru", contacto: "César", correos: ["centralincaworldtravel@gmail.com"], idioma: "es",
      integracion: "manual", cobro: "desconocido", ultimoTema: "el tarifario 2027 y las fotos" })!;
    expect(b.cc).toEqual(["comercial@travelpuzzle.com.mx", "claulet@travelpuzzle.com.mx"]);
    expect(b.cuerpo).toMatch(/^Hola, César:\nLes saluda Adrián/);
    expect(b.cuerpo).toContain("1. Si tienen API");
    expect(b.cuerpo).toContain("5. Para el pago, preferimos que ustedes cobren directo");
    expect(b.cuerpo).toContain("Gracias por el tarifario 2027 y las fotos.");
    expect(b.cuerpo.trim().endsWith("Adrián Rodvar\nTravel Puzzle")).toBe(true);
  });
});

import { textoResumen, esHoraResumen } from "./resumen";
describe("REQ-1568: resumen semanal", () => {
  it("REQ-1568: sale el lunes a las 9:00 de México y no otra hora", () => {
    expect(esHoraResumen("2026-11-09T15:00:00Z")).toBe(true); // lunes 9:00 CDMX
    expect(esHoraResumen("2026-11-09T16:00:00Z")).toBe(false);
    expect(esHoraResumen("2026-11-10T15:00:00Z")).toBe(false);
  });
  it("REQ-1568: arma los 5 bloques con avance, respuestas, lo que te toca (incluidos rebotes), documentos y lo que sale", () => {
    const t = textoResumen({
      proveedores: [
        { nombre: "Destino Colombia", etapa: "respondio", publicado: true, correosInvalidos: [] },
        { nombre: "Tangol", etapa: "por_contactar", publicado: false, correosInvalidos: [] },
        { nombre: "Big Bus", etapa: "por_contactar", publicado: true, correosInvalidos: [] },
        { nombre: "Inca World Peru", etapa: "contactado", publicado: true, correosInvalidos: ["vieja@incaworld.com"] },
      ],
      mensajes: [{ proveedor: "Destino Colombia", direccion: "entrada", tipo: "respuesta", resumen: "Les damos de alta en el portal", fecha: "2026-11-05" },
                 { proveedor: "Tangol", direccion: "entrada", tipo: "automatica", resumen: "Fuera de la oficina", fecha: "2026-11-05" }],
      documentos: [{ proveedor: "Destino Colombia", nombre: "Tarifario 2027.pdf", fecha: "2026-11-05" }],
      proximos: ["Recordatorio a Turismo Asiático (martes)"],
    });
    expect(t).toContain("• Respondieron: 1");
    expect(t).toContain("• Esperan tu primer correo: 2");
    expect(t).toContain("• Destino Colombia: Les damos de alta en el portal");
    expect(t).not.toContain("Fuera de la oficina");
    expect(t.indexOf("Big Bus (publicado)")).toBeLessThan(t.indexOf("Tangol"));
    expect(t).toContain("Rebotó vieja@incaworld.com (Inca World Peru)");
    expect(t).toContain("• Destino Colombia: Tarifario 2027.pdf");
    expect(t).toContain("*5. Esta semana sale*");
    expect(t.length).toBeLessThanOrEqual(3800);
  });
  it("REQ-1568: nunca pasa del límite de WhatsApp", () => {
    const muchos = Array.from({ length: 200 }, (_, i) => ({ nombre: `Proveedor ${i} con un nombre bastante largo para ocupar espacio`, etapa: "contactado" as const, publicado: false, correosInvalidos: [`x${i}@dominio-largo-de-prueba.com`] }));
    expect(textoResumen({ proveedores: muchos, mensajes: [], documentos: [], proximos: [] }).length).toBeLessThanOrEqual(3800);
  });
});

import { pedidosDeAlta, faltantes, puntosDeDocumento, marcarRecibidos, PUNTOS } from "./checklist";
import { puedeEscribir } from "./choques";

describe("REQ-1666/REQ-1665: cobro por tipo y lista de alta en 8 grupos", () => {
  it("REQ-1666: a un DMC con neto no le pide que cobre él; pide condiciones de pago y datos bancarios", () => {
    const c = pedidosDeCobro("desconocido", "es", "dmc");
    expect(c.join(" ")).not.toMatch(/ustedes cobren directo/);
    expect(c[0]).toMatch(/condiciones de pago/);
    expect(c[1]).toMatch(/datos bancarios/);
  });
  it("REQ-1666: a una plataforma le pide liga de pago y comisión", () => {
    const c = pedidosDeCobro("desconocido", "es", "plataforma");
    expect(c.join(" ")).toMatch(/liga de pago/);
    expect(c.join(" ")).toMatch(/comisión/);
    expect(c.join(" ")).not.toMatch(/datos bancarios/);
  });
  it("REQ-1666: sin tipo conserva el comportamiento anterior (LSP)", () => {
    expect(pedidosDeCobro("desconocido")).toEqual(pedidosDeCobro("desconocido", "es"));
  });
  it("REQ-1665: los puntos cubren los 8 grupos", () => {
    expect(new Set(PUNTOS.map((p) => p.grupo))).toEqual(new Set(["integracion", "tarifas", "cobro", "cancelacion", "operacion", "legal", "contenido", "datos"]));
  });
  it("REQ-1665: a un DMC nuevo le pide integración, tarifas por temporada y suplementos, cobro, cancelación, contacto 24/7, legal, contenido y datos", () => {
    const t = pedidosDeAlta({ tipo: "dmc", integracion: "desconocida", cobro: "desconocido", idioma: "es", recibidos: [] }).join("\n");
    for (const re of [/API/, /temporada/, /individual/, /condiciones de pago/, /cancelación/, /24\/7/, /licencia/, /acuerdo de intermediación/, /Fotos/, /datos del viajero/]) expect(t).toMatch(re);
  });
  it("REQ-1665: solo pide lo que falta", () => {
    const t = pedidosDeAlta({ tipo: "dmc", integracion: "api", cobro: "travelpuzzle", idioma: "es", recibidos: ["tarifas", "cancelacion", "operacion", "legal", "acuerdo", "contenido", "datos", "cobro"] });
    expect(t).toEqual([]);
    expect(faltantes("dmc", ["tarifas"]).map((p) => p.id)).not.toContain("tarifas");
  });
  it("REQ-1665: a una plataforma no le pide tarifario por temporada ni el acuerdo de intermediación", () => {
    const t = pedidosDeAlta({ tipo: "plataforma", integracion: "desconocida", cobro: "desconocido", idioma: "es", recibidos: [] }).join("\n");
    expect(t).not.toMatch(/temporada/);
    expect(t).not.toMatch(/acuerdo de intermediación/);
    expect(t).toMatch(/términos para agencias/);
  });
  it("REQ-1665: en inglés también", () => {
    const t = pedidosDeAlta({ tipo: "dmc", integracion: "desconocida", cobro: "desconocido", idioma: "en", recibidos: [] }).join("\n");
    expect(t).toMatch(/season/);
    expect(t).not.toMatch(/temporada/);
  });
  it("REQ-1665: marca lo recibido por el nombre del documento, sin duplicar", () => {
    expect(puntosDeDocumento("Tarifario 2027.pdf")).toEqual(["tarifas"]);
    expect(puntosDeDocumento("Cancellation policy.docx")).toEqual(["cancelacion"]);
    expect(puntosDeDocumento("Licencia RNT.pdf")).toEqual(["legal"]);
    expect(puntosDeDocumento("programa.pptx")).toEqual([]);
    expect(marcarRecibidos(["tarifas"], ["tarifas", "legal"])).toEqual(["tarifas", "legal"]);
  });
});

describe("REQ-1670: la presentación va en el hilo que ya existe", () => {
  it("REQ-1670: con asunto de hilo responde «Re: …» y no duplica el «Re:»", () => {
    const base = { nombre: "Exotic Escapes", contacto: "Angela", correos: ["angela.ballen@exoticescapes.co.in"], idioma: "es" as const, integracion: "desconocida" as const, cobro: "desconocido" as const };
    expect(borradorPresentacion({ ...base, asuntoHilo: "Acuerdo de intermediación Travel Puzzle – Exotic Escapes" })!.asunto).toBe("Re: Acuerdo de intermediación Travel Puzzle – Exotic Escapes");
    expect(borradorPresentacion({ ...base, asuntoHilo: "RE: Tarifas 2027" })!.asunto).toBe("RE: Tarifas 2027");
    expect(borradorPresentacion(base)!.asunto).toMatch(/^Travel Puzzle · /);
  });
});

describe("REQ-1669: sin choques con la revisión cada 6 h", () => {
  const ok = { bloqueos: {}, hiloId: "<m1@x>", etapa: "contactado" as const };
  it("REQ-1669: escribe si no hay bloqueos y el hilo es conocido", () => {
    expect(puedeEscribir(ok)).toEqual({ ok: true });
  });
  it("REQ-1669: no escribe con borrador sin enviar, acuerdo en negociación o folio abierto", () => {
    expect(puedeEscribir({ ...ok, bloqueos: { borradorSinEnviar: true } })).toMatchObject({ ok: false, motivo: expect.stringMatching(/borrador/) });
    expect(puedeEscribir({ ...ok, bloqueos: { acuerdoEnNegociacion: true } })).toMatchObject({ ok: false, motivo: expect.stringMatching(/acuerdo/) });
    expect(puedeEscribir({ ...ok, bloqueos: { folioAbierto: "REQ-1385" } })).toMatchObject({ ok: false, motivo: expect.stringMatching(/REQ-1385/) });
  });
  it("REQ-1669: no sigue un hilo que no le llegó con copia a comercial@", () => {
    expect(puedeEscribir({ ...ok, hiloId: null })).toMatchObject({ ok: false, motivo: expect.stringMatching(/copia a comercial@/) });
  });
});
