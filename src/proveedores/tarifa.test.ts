// REQ-1672, REQ-1580, REQ-1581, REQ-1582: orquestación del cambio de tarifa con un repositorio en memoria.
import { describe, it, expect } from "vitest";
import { revisarTarifa, confirmarTarifa, aplicarVigentes, descartarTarifa, type DepsTarifa } from "./tarifa";
import type { Aviso, Renglon, TarifasRepo } from "./tarifa-repo";
import type { ProveedorFila } from "./repository";
import type { Correo } from "./lib/correo";

const exotic = { id: "exotic", nombre: "Exotic Escapes", correos: ["angela@exotic.in"], correosInvalidos: [], contacto: "Angela", idioma: "es" } as unknown as ProveedorFila;
const rates = { pct: { programa: 0.3, tour: 0.3, privado: 0.25, traslado: 0.3 }, minTourUsd: 10 };

function mundo(hoy = "2026-11-11T18:00:00Z", conRates = true) {
  const anexo: Renglon[] = [{ id: "a1", proveedorId: "exotic", producto: "Triángulo de Oro", neto: 1000, moneda: "USD", kind: "programa", publicado: null, tripId: "t1", optionId: "o1", desde: "2026-01-01" }];
  const avisos: Aviso[] = [];
  const precios: Record<string, { moneda: string; adult: number | null }> = { "t1/o1": { moneda: "USD", adult: 1300 } };
  const enviados: Correo[] = []; const whatsapp: string[] = [];
  let n = 0;
  const repo: TarifasRepo = {
    anexo: async (id) => anexo.filter((r) => r.proveedorId === id),
    renglon: async (id) => anexo.find((r) => r.id === id) ?? null,
    actualizarRenglon: async (id, neto, desde) => { Object.assign(anexo.find((r) => r.id === id)!, { neto, desde }); },
    crearAviso: async (a) => { const x = { ...a, numero: ++n, nota: "", confirmadoPor: null, confirmadoEn: null }; avisos.push(x); return { ...x }; },
    avisos: async (es) => avisos.filter((a) => es.includes(a.estado)).map((a) => ({ ...a })),
    aviso: async (k) => { const a = avisos.find((x) => x.id === k || x.numero === Number(k)); return a ? { ...a } : null; },
    guardarAviso: async (id, c) => { Object.assign(avisos.find((a) => a.id === id)!, c); },
  };
  const deps: DepsTarifa & { proveedor: (id: string) => Promise<ProveedorFila | null> } = {
    repo, hoy, rates: conRates ? rates : null, nuevoId: () => `av${n + 1}`,
    enviar: async (c) => { enviados.push(c); return `<${enviados.length}@r>`; },
    avisarPO: async (t) => { whatsapp.push(t); },
    precioOpcion: async (t, o) => precios[`${t}/${o}`] ?? null,
    guardarPrecio: async (t, o, adult) => { precios[`${t}/${o}`].adult = adult; },
    proveedor: async () => exotic,
  };
  return { deps, anexo, avisos, precios, enviados, whatsapp };
}
const msg = (texto: string, id = "<m1@x>") => ({ messageId: id, asunto: "Tarifas 2027", texto });

describe("REQ-1672: aviso de cambio de tarifa", () => {
  it("REQ-1672: con fecha y monto avisa al PO con antes/después y precio en la página, sin tocar nada", async () => {
    const w = mundo();
    const a = await revisarTarifa(exotic, msg("A partir del 1 de abril de 2027 el Triángulo de Oro sube de 1,000 a 1,080 USD."), w.deps);
    expect(a).toMatchObject({ estado: "por_confirmar", tarifaId: "a1", netoNuevo: 1080, desde: "2027-04-01" });
    expect(w.whatsapp[0]).toMatch(/T-1.*de 1,000 USD a 1,080 USD.*de 1,300 a 1,404/);
    expect(w.enviados).toEqual([]);
    expect(w.anexo[0].neto).toBe(1000);
    expect(w.precios["t1/o1"].adult).toBe(1300);
  });
  it("REQ-1582: sin fecha, Mila la pide en el mismo hilo y no avisa al PO; con la fecha en la respuesta, ya avisa", async () => {
    const w = mundo();
    const a = await revisarTarifa(exotic, msg("El Triángulo de Oro ahora cuesta 1,080 USD."), w.deps);
    expect(a?.estado).toBe("falta_fecha");
    expect(w.enviados[0]).toMatchObject({ subject: "Re: Tarifas 2027", inReplyTo: "<m1@x>" });
    expect(w.enviados[0].text).toMatch(/a partir de qué fecha/);
    expect(w.whatsapp).toEqual([]);
    const b = await revisarTarifa(exotic, msg("Aplica desde el 15 de enero.", "<m2@x>"), w.deps);
    expect(b).toMatchObject({ estado: "por_confirmar", desde: "2027-01-15" });
    expect(w.whatsapp).toHaveLength(1);
  });
  it("REQ-1672: un correo que no habla de tarifas no crea aviso", async () => {
    const w = mundo();
    expect(await revisarTarifa(exotic, msg("Les mando las fotos 2027 del hotel"), w.deps)).toBeNull();
    expect(w.avisos).toEqual([]);
  });
});

describe("REQ-1672/REQ-1580/REQ-1581: la confirmación del PO detona el comando", () => {
  it("REQ-1672: si ya rige, confirmar responde «quedamos enterados», actualiza el anexo y el precio", async () => {
    const w = mundo("2027-04-02T18:00:00Z");
    await revisarTarifa(exotic, msg("Desde el 1 de abril de 2027 el Triángulo de Oro sube de 1,000 a 1,080 USD."), w.deps);
    expect(await confirmarTarifa(1, "PO", w.deps)).toEqual({ ok: true, estado: "aplicado" });
    expect(w.enviados[0].text).toMatch(/Quedamos enterados de la nueva tarifa de Triángulo de Oro: 1,080 USD a partir del 2027-04-01/);
    expect(w.enviados[0]).toMatchObject({ inReplyTo: "<m1@x>", subject: "Re: Tarifas 2027" });
    expect(w.anexo[0]).toMatchObject({ neto: 1080, desde: "2027-04-01" });
    expect(w.precios["t1/o1"].adult).toBe(1404);
    expect(w.avisos[0]).toMatchObject({ estado: "aplicado", confirmadoPor: "PO" });
  });
  it("REQ-1672: si rige después, confirma y el precio cambia hasta ese día (revisión de cada hora)", async () => {
    const w = mundo();
    await revisarTarifa(exotic, msg("Desde el 1 de abril de 2027 el Triángulo de Oro sube de 1,000 a 1,080 USD."), w.deps);
    expect(await confirmarTarifa("1", "PO", w.deps)).toEqual({ ok: true, estado: "confirmado" });
    expect(w.precios["t1/o1"].adult).toBe(1300);
    expect(await aplicarVigentes(w.deps)).toEqual({ aplicados: 0, errores: [] });
    w.deps.hoy = "2027-04-01T07:00:00Z";
    expect(await aplicarVigentes(w.deps)).toEqual({ aplicados: 1, errores: [] });
    expect(w.precios["t1/o1"].adult).toBe(1404);
  });
  it("REQ-1581: si el neto baja, el precio en la página baja", async () => {
    const w = mundo("2027-04-02T18:00:00Z");
    await revisarTarifa(exotic, msg("Desde el 1 de abril de 2027 el Triángulo de Oro baja de 1,000 a 950 USD."), w.deps);
    await confirmarTarifa(1, "PO", w.deps);
    expect(w.precios["t1/o1"].adult).toBe(1235);
  });
  it("REQ-1672: sin confirmación nada cambia; no se confirma dos veces ni uno descartado", async () => {
    const w = mundo("2027-04-02T18:00:00Z");
    await revisarTarifa(exotic, msg("Desde el 1 de abril de 2027 el Triángulo de Oro sube de 1,000 a 1,080 USD."), w.deps);
    expect(await descartarTarifa(1, w.deps)).toEqual({ ok: true, estado: "descartado" });
    expect(await confirmarTarifa(1, "PO", w.deps)).toMatchObject({ ok: false });
    expect(w.enviados).toEqual([]);
    expect(w.anexo[0].neto).toBe(1000);
    expect(w.precios["t1/o1"].adult).toBe(1300);
  });
  it("REQ-1672: sin márgenes o con moneda distinta, confirma el anexo pero no toca el precio y lo reporta", async () => {
    const w = mundo("2027-04-02T18:00:00Z", false);
    await revisarTarifa(exotic, msg("Desde el 1 de abril de 2027 el Triángulo de Oro sube de 1,000 a 1,080 USD."), w.deps);
    expect(await confirmarTarifa(1, "PO", w.deps)).toEqual({ ok: false, motivo: "faltan los márgenes (secreto MARKUP_RATES)" });
    expect(w.anexo[0].neto).toBe(1080);
    expect(w.precios["t1/o1"].adult).toBe(1300);
    expect(w.avisos[0]).toMatchObject({ estado: "confirmado", nota: expect.stringMatching(/MARKUP_RATES/) });
  });
  it("REQ-1580: si el aviso no se ligó a un producto, el panel elige el renglón al confirmar", async () => {
    const w = mundo("2027-04-02T18:00:00Z");
    await revisarTarifa(exotic, msg("Desde el 1 de abril de 2027 el circuito sube de 1,000 a 1,080 USD."), w.deps);
    expect(await confirmarTarifa(1, "PO", w.deps)).toMatchObject({ ok: false, motivo: expect.stringMatching(/anexo/) });
    expect(await confirmarTarifa(1, "PO", w.deps, "a1")).toEqual({ ok: true, estado: "aplicado" });
  });
});
