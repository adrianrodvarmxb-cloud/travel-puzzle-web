import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { REGLAS, canalPara, conectorEncendido, portalAutomatizable, prepararReserva, reglaDe, siguienteEstado, type ReglaProveedor } from "./conector";
import { DIRECTORIO_APROBADO } from "./directorio";

// REQ-10694 construye la regla firmada REQ-10691 (PO, 15 nov 2026): API > portal automatizado por Mila (solo si los
// términos lo permiten) > persona. REQ-10696: regla hija de Extime. REQ-10695: bandera PROVEEDORES_CONECTOR_ON.
const regla = (x: Partial<ReglaProveedor> & { portal?: Partial<ReglaProveedor["portal"]> }): ReglaProveedor => ({
  proveedorId: "p", api: false, porCorreo: [], expediente: "x", ...x,
  portal: { existe: false, automatizable: false, fundamento: null, ...(x.portal ?? {}) },
});

describe("REQ-10691 / REQ-10694: orden de canal API > portal automatizado > persona", () => {
  it("REQ-10691: con API, siempre API, aunque haya portal", () => {
    expect(canalPara(regla({ api: true, portal: { existe: true, automatizable: true, fundamento: "permiso-escrito" } }), "reservar")).toMatchObject({ canal: "api", regla: "REQ-10691-a" });
  });
  it("REQ-10691: sin API y con portal automatizable con fundamento, Mila lo automatiza", () => {
    expect(canalPara(regla({ portal: { existe: true, automatizable: true, fundamento: "terminos-lo-permiten" } }), "reservar")).toMatchObject({ canal: "portal-automatizado", regla: "REQ-10691-c" });
    expect(canalPara(regla({ portal: { existe: true, automatizable: true, fundamento: "permiso-escrito" } }), "cancelar").canal).toBe("portal-automatizado");
  });
  it("REQ-10691: un portal «automatizable» sin fundamento NO cuenta: persona", () => {
    expect(portalAutomatizable({ existe: true, automatizable: true, fundamento: null })).toBe(false);
    expect(canalPara(regla({ portal: { existe: true, automatizable: true, fundamento: null } }), "reservar").canal).toBe("persona");
  });
  it("REQ-10691: portal cuyos términos prohíben software: persona captura, Mila prepara", () => {
    const d = canalPara(regla({ portal: { existe: true, automatizable: false, fundamento: null } }), "reservar");
    expect(d.canal).toBe("persona");
    expect(d.motivo).toMatch(/una persona captura/);
  });
  it("REQ-10691 (e): sin API ni portal, cancelar por correo solo si el proveedor lo acepta; el correo pasa por la regla de borradores (REQ-10693)", () => {
    expect(canalPara(regla({ porCorreo: ["cancelar"] }), "cancelar")).toMatchObject({ canal: "persona", regla: "REQ-10691-e" });
    expect(canalPara(regla({ porCorreo: ["cancelar"] }), "reservar")).toMatchObject({ canal: "persona", regla: "REQ-10691-c" });
  });
  it("REQ-10691 (g): un proveedor sin regla firmada cae en persona", () => {
    expect(reglaDe("desconocido").expediente).toBe("sin expediente firmado");
    expect(canalPara(reglaDe("desconocido"), "reservar").canal).toBe("persona");
  });
});

describe("REQ-10696: regla hija de Extime (REQ-10692, pendiente 5)", () => {
  it("REQ-10696: Extime: portal no automatizable, sin pedir permiso, persona captura hasta tener API; cancelaciones y cambios por correo", () => {
    const e = REGLAS["extime-travel"];
    expect(e.api).toBe(false);
    expect(e.portal).toEqual({ existe: true, automatizable: false, fundamento: null, sinPedirPermiso: true });
    const d = canalPara(e, "reservar");
    expect(d.canal).toBe("persona");
    expect(d.motivo).toMatch(/no se pide permiso de automatizar hasta tener API/);
    expect(canalPara(e, "cancelar").canal).toBe("persona");
    expect(e.porCorreo).toEqual(["cancelar", "cambiar"]);
  });
  it("REQ-10696 / REQ-10692 (5): la semilla del directorio deja a extime-travel con integración api y canal api", () => {
    const extime = DIRECTORIO_APROBADO.find((p) => p.id === "extime-travel")!;
    expect(extime).toMatchObject({ integracion: "api", canal: "api" });
    expect(extime.notas).toMatch(/correo/);
  });
  it("REQ-10696: cuando Extime entregue la API, basta `api: true` para que el canal cambie sin tocar el resto", () => {
    expect(canalPara({ ...REGLAS["extime-travel"], api: true }, "reservar").canal).toBe("api");
  });
});

describe("REQ-10694: paquete para la persona y estado de la reserva", () => {
  const base = { proveedorId: "extime-travel", producto: "Versalles medio día", fecha: "2026-12-03", adultos: 2, ninos: 0, opcion: "con traslado", viajero: { nombre: "Ana", correo: "ana@x.com", telefono: "+52" }, precioPublico: { monto: 180, moneda: "EUR" }, notas: " " };
  it("REQ-10694: el paquete lleva producto, fecha, personas, opción y viajero; nunca neto ni margen", () => {
    expect(prepararReserva(base)).toEqual({ ok: true, paquete: { ...base, notas: "" } });
    expect(prepararReserva({ ...base, ...({ neto: 120 } as object) })).toMatchObject({ ok: false, motivo: /neto/ });
    expect(prepararReserva({ ...base, fecha: "3/12/2026" })).toMatchObject({ ok: false });
    expect(prepararReserva({ ...base, viajero: { ...base.viajero, correo: "x" } })).toMatchObject({ ok: false });
  });
  it("REQ-10691 (d): la reserva solo cuenta como hecha con la confirmación del proveedor", () => {
    expect(siguienteEstado("preparada", "persona-capturo")).toBe("capturada");
    expect(siguienteEstado("capturada", "api-ok")).toBe("capturada");
    expect(siguienteEstado("capturada", "proveedor-confirmo")).toBe("confirmada");
    expect(siguienteEstado("confirmada", "proveedor-rechazo")).toBe("confirmada");
    expect(siguienteEstado("preparada", "proveedor-rechazo")).toBe("rechazada");
  });
});

describe("REQ-10695: bandera PROVEEDORES_CONECTOR_ON", () => {
  it("REQ-10695: existe en wrangler.jsonc en \"false\" y solo \"true\" exacto la enciende", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"PROVEEDORES_CONECTOR_ON":\s*"false"/);
    expect(conectorEncendido({ PROVEEDORES_CONECTOR_ON: "true" })).toBe(true);
    expect(conectorEncendido({ PROVEEDORES_CONECTOR_ON: "TRUE" })).toBe(false);
    expect(conectorEncendido({})).toBe(false);
  });
});
