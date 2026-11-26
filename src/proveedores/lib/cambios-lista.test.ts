// REQ-10887 (plan REQ-10886 §6; frente REQ-10885): lector y validador puros de la lista «cambios para la página».
import { describe, expect, it } from "vitest";
import { filtrarAlcance, leerLista, validarCambio } from "./cambios-lista";

const alcance = {
  fuera: ["tangol", "freetour", "eurowelcome", "big-bus-tours", "extime-travel", "bemyguest", "hotelbeds"],
  dentro: ["exotic-escapes", "fantastica-china", "destino-colombia"],
};
const precioExotic = {
  id: "2026-11-26-exotic-01", proveedor: "exotic-escapes", tipo: "precio", producto: "Triángulo de Oro",
  neto: { monto: 1080, moneda: "USD", montoVerificado: 1080 }, desde: "2027-04-01",
  fuente: { mensajeId: "<a@exotic>", fecha: "2026-11-25", adjunto: "Tarifario 2027.pdf", pagina: 3 },
};
const descripcionChina = {
  id: "2026-11-26-fchina-02", proveedor: "fantastica-china", tipo: "descripcion", producto: "Beijing clásico R1",
  texto: "Incluye la Gran Muralla en Mutianyu.", fuente: { mensajeId: "<b@fchina>", fecha: "2026-11-25" },
};
const lista = (over: Record<string, unknown> = {}): Record<string, unknown> => ({ version: 1, generadoEn: "2026-11-26", origen: "proveedores/cambios-para-la-pagina.md", alcance, cambios: [precioExotic, descripcionChina], ...over });

describe("REQ-10887: lector de la lista «cambios para la página»", () => {
  it("REQ-10887: un JSON del contrato pasa con sus cambios y su alcance", () => {
    const r = leerLista(lista());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lista.cambios.map((c) => c.id)).toEqual(["2026-11-26-exotic-01", "2026-11-26-fchina-02"]);
    expect(r.lista.alcance.dentro).toContain("exotic-escapes");
  });

  it("REQ-10887: sin alcance, con tipo desconocido, con cambio incompleto o con texto que no es JSON falla con su motivo", () => {
    const sinAlcance = leerLista({ ...lista(), alcance: undefined });
    expect(sinAlcance.ok).toBe(false);
    if (!sinAlcance.ok) expect(sinAlcance.motivos.join(" ")).toMatch(/alcance/);
    const tipoRaro = leerLista(lista({ cambios: [{ ...precioExotic, tipo: "bonito" }] }));
    expect(tipoRaro.ok).toBe(false);
    if (!tipoRaro.ok) expect(tipoRaro.motivos.join(" ")).toMatch(/tipo/);
    const incompleto = leerLista(lista({ cambios: [{ ...precioExotic, neto: undefined }] }));
    expect(incompleto.ok).toBe(false);
    if (!incompleto.ok) expect(incompleto.motivos.join(" ")).toMatch(/neto/);
    expect(leerLista("no soy json").ok).toBe(false);
    expect(leerLista(null).ok).toBe(false);
    // Un id de cambio repetido no pasa: cada cambio es uno.
    expect(leerLista(lista({ cambios: [precioExotic, precioExotic] })).ok).toBe(false);
  });

  it("REQ-10887: la lista puede venir como texto JSON (así llega al Worker)", () => {
    const r = leerLista(JSON.stringify(lista()));
    expect(r.ok).toBe(true);
  });
});

describe("REQ-10887: filtro de alcance (solo proveedores sin API)", () => {
  it("REQ-10887: un cambio de un proveedor «fuera» (Tangol) se ignora y se registra; uno «dentro» (Exotic Escapes) entra", () => {
    const r = leerLista(lista({ cambios: [precioExotic, { ...precioExotic, id: "2026-11-26-tangol-01", proveedor: "tangol", producto: "Perito Moreno" }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const f = filtrarAlcance(r.lista);
    expect(f.dentro.map((c) => c.id)).toEqual(["2026-11-26-exotic-01"]);
    expect(f.ignorados).toEqual([{ id: "2026-11-26-tangol-01", proveedor: "tangol", motivo: "fuera del alcance: el proveedor tiene API o su propio sync (lo decide el PO en la lista)" }]);
  });

  it("REQ-10887: un proveedor que no está en ningún grupo se registra y se ignora; nunca se adivina", () => {
    const r = leerLista(lista({ cambios: [{ ...precioExotic, id: "x-01", proveedor: "proveedor-nuevo" }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const f = filtrarAlcance(r.lista);
    expect(f.dentro).toEqual([]);
    expect(f.ignorados[0]).toMatchObject({ id: "x-01", proveedor: "proveedor-nuevo" });
    expect(f.ignorados[0].motivo).toMatch(/ningún grupo/);
  });

  it("REQ-10887: un proveedor en los dos grupos cuenta como «fuera» (lo seguro) y se registra el choque", () => {
    const r = leerLista(lista({ alcance: { fuera: ["exotic-escapes"], dentro: ["exotic-escapes"] }, cambios: [precioExotic] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const f = filtrarAlcance(r.lista);
    expect(f.dentro).toEqual([]);
    expect(f.ignorados[0].motivo).toMatch(/los dos grupos/);
  });

  it("REQ-10887: el alcance se lee con mayúsculas, espacios y acentos distintos sin cambiar de grupo", () => {
    const r = leerLista(lista({ alcance: { fuera: [" Tangol "], dentro: ["Exotic-Escapes"] }, cambios: [precioExotic] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(filtrarAlcance(r.lista).dentro.map((c) => c.id)).toEqual(["2026-11-26-exotic-01"]);
  });
});

describe("REQ-10887: validación de cada cambio (REQ-10678: doble lectura, dato completo)", () => {
  it("REQ-10887: un precio con doble lectura que coincide, moneda, fecha y producto es aplicable solo", () => {
    const v = validarCambio(precioExotic as never);
    expect(v).toEqual({ aplicableSolo: true, motivos: [] });
  });

  it("REQ-10887: sin doble lectura o con doble lectura que no coincide no es aplicable solo (queda para el PO)", () => {
    expect(validarCambio({ ...precioExotic, neto: { monto: 1080, moneda: "USD" } } as never)).toEqual({ aplicableSolo: false, motivos: ["sin doble lectura del neto"] });
    expect(validarCambio({ ...precioExotic, neto: { monto: 1080, moneda: "USD", montoVerificado: 1800 } } as never)).toEqual({ aplicableSolo: false, motivos: ["la doble lectura del neto no coincide"] });
  });

  it("REQ-10887: moneda, fecha de vigencia y producto son obligatorios en un precio; la fecha va en ISO", () => {
    const r1 = leerLista(lista({ cambios: [{ ...precioExotic, desde: "1 de abril" }] }));
    expect(r1.ok).toBe(false);
    const r2 = leerLista(lista({ cambios: [{ ...precioExotic, neto: { monto: 1080, moneda: "CNY", montoVerificado: 1080 } }] }));
    expect(r2.ok).toBe(false);
    const r3 = leerLista(lista({ cambios: [{ ...precioExotic, producto: " " }] }));
    expect(r3.ok).toBe(false);
    const r4 = leerLista(lista({ cambios: [{ ...precioExotic, neto: { monto: 0, moneda: "USD", montoVerificado: 0 } }] }));
    expect(r4.ok).toBe(false);
  });

  it("REQ-10887: una vigencia lleva sus dos fechas en orden; descripción, programa y condiciones llevan texto", () => {
    const vig = { id: "v-1", proveedor: "fantastica-china", tipo: "vigencia", producto: "Beijing clásico R1", temporada: { desde: "2027-01-10", hasta: "2026-12-15" }, fuente: { mensajeId: "<c>", fecha: "2026-11-25" } };
    expect(leerLista(lista({ cambios: [vig] })).ok).toBe(false);
    const ok = leerLista(lista({ cambios: [{ ...vig, temporada: { desde: "2026-12-15", hasta: "2027-01-10" } }] }));
    expect(ok.ok).toBe(true);
    expect(leerLista(lista({ cambios: [{ ...descripcionChina, texto: "" }] })).ok).toBe(false);
    const prog = leerLista(lista({ cambios: [{ ...descripcionChina, id: "p-1", tipo: "programa", texto: "Día 1: llegada." }] }));
    expect(prog.ok).toBe(true);
    // Los cambios que no son precio nunca son «aplicables solos»: son propuesta para el PO.
    if (prog.ok) expect(validarCambio(prog.lista.cambios[0])).toEqual({ aplicableSolo: false, motivos: ["no es precio: queda como propuesta para el PO"] });
  });

  it("REQ-10887: el neto no sale en el registro de ignorados ni en los motivos (nunca al cliente)", () => {
    const r = leerLista(lista({ cambios: [{ ...precioExotic, id: "t-1", proveedor: "tangol" }] }));
    if (!r.ok) throw new Error("debía pasar");
    const f = filtrarAlcance(r.lista);
    expect(JSON.stringify(f.ignorados)).not.toContain("1080");
    const v = validarCambio({ ...precioExotic, neto: { monto: 1080, moneda: "USD", montoVerificado: 1800 } } as never);
    expect(JSON.stringify(v.motivos)).not.toMatch(/1080|1800/);
  });
});
