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
