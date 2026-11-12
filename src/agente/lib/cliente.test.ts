// REQ-3356, REQ-3357: servicio a clientes. Mila solo ve las reservas y pagos del titular verificado.
import { describe, it, expect } from "vitest";
import { verificarTitular, resumenReserva, mismoTelefono } from "./cliente";

const sol = (o: object) => ({ id: "r1", ref: "TP-ABC123", tripTitle: "Triángulo de Oro", tripCode: "TP-0001", kind: "reserva", status: "quoted", date: "2027-04-01", endDate: null,
  optionName: "Doble", adults: 2, children: 0, infants: 0, firstName: "Ana", lastName: "Pérez", email: "ana@correo.com", phone: "+52 618 112 9459", estimate: 2600, currency: "USD",
  notes: "nota interna", hotel: "", comments: "", ...o });
const s1 = sol({});
const s2 = sol({ id: "r2", ref: "TP-ZZZ999", phone: "+52 55 0000 0000", email: "otro@correo.com", firstName: "Luis" });
const pagos = [
  { requestId: "r1", kind: "anticipo", amountCentavos: 2600000, currency: "MXN", status: "paid", paidAt: new Date("2026-11-10T10:00:00Z"), checkoutUrl: "https://pay/x", expiresAt: new Date("2026-11-11") },
  { requestId: "r1", kind: "liquidacion", amountCentavos: 2600000, currency: "MXN", status: "pending", paidAt: null, checkoutUrl: "https://pay/y", expiresAt: new Date("2026-12-01") },
];

describe("REQ-3357: verificación del titular", () => {
  it("REQ-3357: el número de WhatsApp coincide con el de la reserva (con o sin 52/1): responde directo", () => {
    expect(mismoTelefono("5216181129459", "+52 618 112 9459")).toBe(true);
    expect(verificarTitular({ telefono: "526181129459" }, [s1, s2])).toEqual({ ok: true, via: "telefono", ids: ["r1"] });
  });
  it("REQ-3357: si el número no coincide, pide folio y correo; con ambos correctos responde solo esa reserva", () => {
    expect(verificarTitular({ telefono: "5219999999999" }, [s1, s2])).toEqual({ ok: false, pide: "folio_y_correo" });
    expect(verificarTitular({ telefono: "5219999999999", folio: "tp-abc123", correo: "ANA@correo.com " }, [s1, s2])).toEqual({ ok: true, via: "folio_y_correo", ids: ["r1"] });
  });
  it("REQ-3357: folio correcto con correo de otra persona no da nada", () => {
    expect(verificarTitular({ folio: "TP-ABC123", correo: "otro@correo.com" }, [s1, s2])).toEqual({ ok: false, pide: "folio_y_correo" });
  });
});

describe("REQ-3356: resumen de la reserva para el titular", () => {
  it("REQ-3356: estado, viaje, fecha, personas, pagos hechos y pendiente con su liga; sin notas internas ni datos de otros", () => {
    const r = resumenReserva(s1, pagos, new Date("2026-11-12T12:00:00Z"));
    expect(r).toMatchObject({ folio: "TP-ABC123", viaje: "Triángulo de Oro", estado: "Cotizada", fecha: "2027-04-01", personas: "2 adultos", opcion: "Doble",
      pagos: [{ concepto: "Anticipo", monto: "$26,000.00 MXN", estado: "pagado", fecha: "2026-11-10" }, { concepto: "Liquidación", monto: "$26,000.00 MXN", estado: "pendiente", liga: "https://pay/y" }] });
    expect(JSON.stringify(r)).not.toContain("nota interna");
  });
  it("REQ-3356: una liga de pago vencida no se manda", () => {
    const r = resumenReserva(s1, pagos, new Date("2026-12-02T00:00:00Z"));
    expect(r.pagos[1]).toEqual({ concepto: "Liquidación", monto: "$26,000.00 MXN", estado: "liga vencida" });
  });
});
