'use client';

import { ChevronLeftIcon } from "@/assets/svg";
import { Button } from "../ui";
import { useBookingForm } from "./Contexts";

interface EventBookingConfirmProps {
  onBack: () => void;
}

/** Paso 2: resumen y confirmación real de la reserva (free tours). */
export function EventBookingConfirm({ onBack }: EventBookingConfirmProps) {
  const { form, submitBooking, isSubmitting, submitError, bookingsEnabled, booking } = useBookingForm();

  if (booking) return <BookingConfirmed refNumber={booking.refNumber} canBeCanceled={!!booking.canBeCanceled} />;

  const isPaid = form.price > 0;
  const people = form.adults + form.children;

  return (
    <div className="bg-gray-50 p-6 rounded-lg border-2 border-orange-500 space-y-4">
      <div className="v-center-normal gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeftIcon className="w-4 h-4" />
          Anterior
        </Button>
        <h2 className="text-lg font-semibold">Confirmar reserva</h2>
      </div>

      <ul className="text-sm space-y-1">
        <li><strong>Personas:</strong> {people} ({form.adults} adultos{form.children ? `, ${form.children} niños` : ""})</li>
        <li><strong>A nombre de:</strong> {form.customer.firstName} {form.customer.lastName}</li>
        <li><strong>Correo:</strong> {form.customer.email}</li>
      </ul>

      {!bookingsEnabled ? (
        <Notice>Las reservas en línea abren muy pronto.</Notice>
      ) : isPaid ? (
        <Notice>Este tour es de pago. El pago en línea estará disponible muy pronto.</Notice>
      ) : (
        <>
          {submitError && <p className="text-sm text-red-600" role="alert">{submitError}</p>}
          <div className="flex justify-end">
            <Button variant="accent" onClick={submitBooking} disabled={isSubmitting}>
              {isSubmitting ? "Confirmando…" : "Confirmar reserva"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="text-sm bg-white border rounded-md p-3">{children}</p>;
}

function BookingConfirmed({ refNumber, canBeCanceled }: { refNumber: string; canBeCanceled: boolean }) {
  return (
    <div className="bg-green-50 p-6 rounded-lg border-2 border-green-600 space-y-2" role="status">
      <h2 className="text-lg font-semibold">¡Reserva confirmada!</h2>
      <p>Tu número de reserva es <strong className="font-mono">{refNumber}</strong>. Guárdalo: lo necesitarás para cualquier cambio.</p>
      {canBeCanceled && <p className="text-sm text-gray-600">Si no puedes asistir, por favor cancela para liberar el lugar.</p>}
    </div>
  );
}
