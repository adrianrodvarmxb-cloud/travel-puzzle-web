// REQ-10776: el modelo se valida antes de llegar al cliente; un registro malo se descarta con motivo.
import { describe, expect, it } from "vitest";
import { checkFicha } from "./ficha";
import { fichaEjemplo } from "../lib/fixtures";

describe("REQ-10776: esquema de la ficha", () => {
  it("REQ-10776: una ficha completa pasa tal cual", () => {
    const r = checkFicha(fichaEjemplo());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ficha.title).toBe(fichaEjemplo().title);
  });
  it("REQ-10776: un registro malo se descarta con el campo y el motivo (no tumba la página)", () => {
    expect(checkFicha({ ...fichaEjemplo(), title: "" })).toMatchObject({ ok: false, reason: expect.stringContaining("title") });
    expect(checkFicha({ ...fichaEjemplo(), meeting: { kind: "exact", lat: 999, lng: 0, title: null } })).toMatchObject({ ok: false, reason: expect.stringContaining("meeting") });
    expect(checkFicha({ ...fichaEjemplo(), facts: { ...fichaEjemplo().facts, difficulty: 7 } })).toMatchObject({ ok: false, reason: expect.stringContaining("difficulty") });
    expect(checkFicha(null)).toMatchObject({ ok: false });
  });
  it("REQ-10776: ningún campo privado (neto, comisión, teléfono, correo) pasa al cliente, en ningún nivel", () => {
    expect(checkFicha({ ...fichaEjemplo(), net: 50 })).toMatchObject({ ok: false, reason: "campo privado en el modelo: net" });
    expect(checkFicha({ ...fichaEjemplo(), options: [{ id: "a", name: "A", price: null, transferIncluded: null, startTime: null, comision: 10 }] })).toMatchObject({ ok: false, reason: expect.stringContaining("options[0].comision") });
    expect(checkFicha({ ...fichaEjemplo(), providerPhone: "+54 11" })).toMatchObject({ ok: false });
    expect(checkFicha({ ...fichaEjemplo(), extra: 1 })).toMatchObject({ ok: false }); // llave desconocida en la raíz
  });
});
