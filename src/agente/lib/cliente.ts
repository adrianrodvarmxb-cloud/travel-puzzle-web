// Puro · REQ-3356, REQ-3357: servicio a clientes por el agente. Solo las solicitudes y pagos del titular verificado:
// por su número de WhatsApp o, si no coincide, por folio y correo juntos. Nunca notas internas ni datos de otra persona.
import { REQUEST_STATUS_LABEL, type RequestStatus } from "@/trips/lib/request";

export interface SolicitudCliente {
  id: string; ref: string; tripTitle: string; kind: string; status: string; date: string; endDate: string | null; optionName: string | null;
  adults: number; children: number; infants: number; email: string; phone: string;
}
export interface PagoCliente { requestId: string; kind: string; amountCentavos: number; currency: string; status: string; paidAt: Date | null; checkoutUrl: string; expiresAt: Date }
export type Verificacion = { ok: true; via: "telefono" | "folio_y_correo"; ids: string[] } | { ok: false; pide: "folio_y_correo" };

const digitos = (s: string) => s.replace(/\D/g, "");
// México: 52 o 521 + 10 dígitos; se comparan los últimos 10.
export const mismoTelefono = (a: string, b: string) => { const x = digitos(a), y = digitos(b); return x.length >= 10 && y.length >= 10 && x.slice(-10) === y.slice(-10); };

// REQ-3357
export function verificarTitular(q: { telefono?: string; folio?: string; correo?: string }, solicitudes: SolicitudCliente[]): Verificacion {
  if (q.folio && q.correo) {
    const f = q.folio.trim().toUpperCase(), c = q.correo.trim().toLowerCase();
    const s = solicitudes.find((x) => x.ref.toUpperCase() === f && x.email.trim().toLowerCase() === c);
    if (s) return { ok: true, via: "folio_y_correo", ids: [s.id] };
  }
  if (q.telefono) {
    const ids = solicitudes.filter((x) => mismoTelefono(q.telefono!, x.phone)).map((x) => x.id);
    if (ids.length) return { ok: true, via: "telefono", ids };
  }
  return { ok: false, pide: "folio_y_correo" };
}

const KIND: Record<string, string> = { anticipo: "Anticipo", liquidacion: "Liquidación", total: "Pago total" };
const dinero = (centavos: number, moneda: string) => `$${(centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
const personas = (s: SolicitudCliente) => [s.adults && `${s.adults} adulto${s.adults === 1 ? "" : "s"}`, s.children && `${s.children} niño${s.children === 1 ? "" : "s"}`,
  s.infants && `${s.infants} infante${s.infants === 1 ? "" : "s"}`].filter(Boolean).join(", ");

// REQ-3356: lo que Mila puede decirle al titular de su reserva.
export function resumenReserva(s: SolicitudCliente, pagos: PagoCliente[], ahora: Date) {
  return {
    folio: s.ref, viaje: s.tripTitle, tipo: s.kind, estado: REQUEST_STATUS_LABEL[s.status as RequestStatus] ?? s.status,
    fecha: s.date, ...(s.endDate && { fechaFin: s.endDate }), opcion: s.optionName ?? "", personas: personas(s),
    pagos: pagos.filter((p) => p.requestId === s.id).map((p) => {
      const base = { concepto: KIND[p.kind] ?? p.kind, monto: dinero(p.amountCentavos, p.currency) };
      if (p.status === "paid") return { ...base, estado: "pagado", fecha: p.paidAt ? p.paidAt.toISOString().slice(0, 10) : "" };
      if (p.status === "pending" && p.expiresAt > ahora) return { ...base, estado: "pendiente", liga: p.checkoutUrl };
      if (p.status === "pending") return { ...base, estado: "liga vencida" };
      return { ...base, estado: p.status };
    }),
  };
}

// REQ-3356: bandera propia, apagada hasta validar el aviso de privacidad (REQ-3359).
export const clientesEncendido = (env: Record<string, string | undefined>) => env.AGENTE_CLIENTES_ON === "true";
