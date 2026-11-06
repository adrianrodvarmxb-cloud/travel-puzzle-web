'use client';

import { Eyebrow, mono } from '@/components/booking/email-ui';
import { useBookingForm } from './Contexts';
import { TripLinkCard } from '@/components/booking/TripLinkCard';
import { PaidPolicyNotice } from '@/components/tours/PaidPolicyNotice';
import type { PaidPolicy } from '@/tours/lib/paid-policy';

interface EventBookingConfirmProps {
  onBack: () => void;
  /** Pago, cancelación y no presentarse (tours con costo, con PAID_TOURS_ENABLED). */
  policy?: PaidPolicy | null;
}

/** Paso 2: 03 Confirmar (resumen y reserva real de free tours). */
export function EventBookingConfirm({ onBack, policy }: EventBookingConfirmProps) {
  const { form, submitBooking, isSubmitting, submitError, bookingsEnabled, booking, tripUrl } = useBookingForm();

  if (booking) return <BookingConfirmed refNumber={booking.refNumber} canBeCanceled={!!booking.canBeCanceled} tripUrl={tripUrl} />;

  const isPaid = form.price > 0;
  const people = form.adults + form.children;
  const rows: [string, string][] = [
    ['Personas', `${people} (${form.adults} adultos${form.children ? `, ${form.children} niños` : ''})`],
    ['A nombre de', `${form.customer.firstName} ${form.customer.lastName}`],
    ['Correo', form.customer.email],
  ];

  return (
    <section className="px-6 pt-7">
      <Eyebrow n={3}>Confirmar</Eyebrow>
      <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">Revisa y confirma</h2>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[38%_1fr] border-b border-[#E6EBF5] py-3 text-sm">
            <dt className={`${mono} text-[10px] text-gray-500`}>{k}</dt>
            <dd className="break-all font-semibold text-[#0A1330]">{v}</dd>
          </div>
        ))}
      </dl>

      {isPaid && policy && <PaidPolicyNotice policy={policy} className="mt-5 text-[#0A1330]" />}
      <div className="mt-5">
        {!bookingsEnabled ? (
          <Notice>Las reservas en línea abren muy pronto.</Notice>
        ) : isPaid ? (
          <Notice>Esta experiencia es de pago. El pago en línea estará disponible muy pronto.</Notice>
        ) : (
          <>
            {submitError && <p role="alert" className="mb-3 rounded-xl border border-[#C12909]/30 bg-[#C12909]/5 px-4 py-3 text-sm text-[#0A1330]">{submitError}</p>}
            <button type="button" onClick={submitBooking} disabled={isSubmitting} className="block w-full rounded-xl bg-[#C12909] px-5 py-4 text-center text-base font-bold text-white hover:opacity-90 disabled:opacity-50">
              {isSubmitting ? 'Confirmando…' : 'Confirmar reserva  →'}
            </button>
          </>
        )}
        <button type="button" onClick={onBack} className="mt-3 block w-full text-center text-sm font-semibold text-[#008DFF] hover:underline">← Cambiar mis datos</button>
      </div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-[#E6EBF5] bg-[#F4F7FD] px-4 py-3 text-sm text-[#0A1330]">{children}</p>;
}

/** REQ-182: `tripUrl` solo llega con ARMA_TU_VIAJE_ENABLED; el texto ofrece complementos, no tours (regla B3). */
export function BookingConfirmed({ refNumber, canBeCanceled, tripUrl }: { refNumber: string; canBeCanceled: boolean; tripUrl?: string | null }) {
  return (
    <section className="px-6 pt-7" role="status">
      <p className={`${mono} text-[#2E9E5B]`}><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#3DDC84] align-middle" />Reserva confirmada</p>
      <h2 className="mt-2 text-[24px] font-bold tracking-tight text-[#0A1330]">¡Tu lugar está apartado!</h2>
      <p className="mt-2 text-sm text-gray-600">Tu número de reserva es <strong className="font-mono text-[#0A1330]">{refNumber}</strong>. Te lo mandamos por correo con el enlace para ver, cambiar o cancelar tu reserva.</p>
      {canBeCanceled && <p className="mt-2 text-sm text-gray-600">Si no puedes asistir, cancela para liberar el lugar.</p>}
      <TripLinkCard href={tripUrl} className="mt-5" />
    </section>
  );
}
