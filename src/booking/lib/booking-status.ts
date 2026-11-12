/**
 * REQ-065: etiqueta, colores y titular de la página de la reserva según su estado.
 * Solo «active» dice que el lugar está apartado; cualquier otro estado (incluido uno desconocido) no lo promete. Puro.
 */
export type BookingHeadline = { label: string; dot: string; text: string; title: string; active: boolean };

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  active: { label: "Reserva confirmada", dot: "bg-[#3DDC84]", text: "text-[#7CE3A1]" },
  canceled: { label: "Reserva cancelada", dot: "bg-[#EAF54F]", text: "text-[#F3F8B0]" },
  rejected: { label: "Reserva rechazada", dot: "bg-[#FF6B5A]", text: "text-[#FFB3A8]" },
  // REQ-017
  cancel_requested: { label: "Cancelación en proceso", dot: "bg-[#EAF54F]", text: "text-[#F3F8B0]" },
  // REQ-931: tour de pago reservado y todavía sin pagar (FREETOUR lo marca «unpaid»).
  pending_payment: { label: "Pago pendiente", dot: "bg-[#EAF54F]", text: "text-[#F3F8B0]" },
  unpaid: { label: "Pago pendiente", dot: "bg-[#EAF54F]", text: "text-[#F3F8B0]" },
};

// REQ-065
export function bookingHeadline(status: string, payHref: string | null | undefined): BookingHeadline {
  const st = STATUS[status] ?? { label: status, dot: "bg-gray-300", text: "text-gray-200" };
  const active = status === "active";
  const title = active
    ? "¡Tu lugar está apartado!"
    : status === "canceled"
      ? "Tu reserva quedó cancelada"
      : status === "cancel_requested"
        ? "Recibimos tu cancelación"
        : payHref
          ? "Falta completar tu pago"
          : "Tu reserva no pudo confirmarse";
  return { ...st, title, active };
}
