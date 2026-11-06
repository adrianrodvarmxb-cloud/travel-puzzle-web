'use client';

import { phoneLabel } from '@/booking/lib/phone-field';
import { Input } from '@/components/ui/Input';
import { Eyebrow } from '@/components/booking/email-ui';
import { PeopleSelector } from './PeopleSelector';
import { useBookingForm } from './Contexts';
import { PrivacyFormNotice } from '@/components/legal/PrivacyFormNotice';
import { checkAdultContact } from '@/booking/lib/adult-contact';

interface EventDetailData {
  id: number;
  isAvailable: boolean;
  minAdultsPerBooking: number;
  availableAdultPlaces: number;
  fullPricePerGroup: Record<string, number>;
  payableNowPricePerGroup: Record<string, number>;
  isPartiallyPaid: boolean;
  /** Freetour: el proveedor exige teléfono (REQ-015). */
  isPhoneRequired?: boolean | number;
}

interface EventBookingFormProps {
  language: string;
  eventDetailData?: EventDetailData;
  isLoading?: boolean;
  error?: Error | null;
  onNext: () => void;
}

/** Paso 1: 01 Personas y 02 Tus datos (estilo de los correos). La validación vive en el contexto. */
export function EventBookingForm({ language, eventDetailData, isLoading = false, error, onNext }: EventBookingFormProps) {
  const { form, errors, handlers, isFormValid, submitError, isReady, adultContactCheck, contactIsAdult, setContactIsAdult } = useBookingForm();

  if (!isReady) return <p className="px-6 py-8 text-sm text-gray-500">Cargando formulario…</p>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid() && checkAdultContact(contactIsAdult, adultContactCheck).ok) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7 pt-7">
      {(error || submitError) && (
        <p role="alert" className="mx-6 rounded-xl border border-[#C12909]/30 bg-[#C12909]/5 px-4 py-3 text-sm text-[#0A1330]">
          {submitError ?? 'No pudimos cargar los lugares disponibles. Intenta de nuevo en un momento.'}
        </p>
      )}

      <section className="px-6">
        <Eyebrow n={1}>Personas</Eyebrow>
        <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">¿Cuántos van?</h2>
        <PeopleSelector eventDetailData={eventDetailData} value={form.adults} onChange={(value) => handlers.adults(value)} isLoading={isLoading} />
      </section>

      <section className="px-6">
        <Eyebrow n={2}>Tus datos</Eyebrow>
        <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">¿A nombre de quién?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input type="text" label="Nombre" value={form.customer.firstName} onChange={(e) => handlers.customer.firstName(e.target.value)} error={errors.customer?.firstName} required className="w-full" />
          <Input type="text" label="Apellido" value={form.customer.lastName} onChange={(e) => handlers.customer.lastName(e.target.value)} error={errors.customer?.lastName} required className="w-full" />
          <Input type="email" label="Correo" value={form.customer.email} onChange={(e) => handlers.customer.email(e.target.value)} error={errors.customer?.email} required className="w-full" />
          <Input type="tel" label={phoneLabel(eventDetailData?.isPhoneRequired)} value={form.customer.phone || ''} onChange={(e) => handlers.customer.phone(e.target.value)} error={errors.customer?.phone} className="w-full" />
        </div>
        <p className="mt-2 text-[13px] text-gray-500">Te mandamos la confirmación a este correo.</p>
        {adultContactCheck && (
          // REQ-083: el contacto de la reserva debe ser adulto (tras ADULT_CONTACT_CHECK_ENABLED).
          <label className="mt-3 flex items-start gap-3 text-sm text-[#0A1330]">
            <input type="checkbox" name="contactIsAdult" checked={contactIsAdult} onChange={(e) => setContactIsAdult(e.target.checked)} required className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Soy mayor de edad y seré la persona de contacto de esta reserva.</span>
          </label>
        )}
      </section>

      <section className="px-6">
        {/* Aviso legal (el formulario solo existe con BOOKINGS_ENABLED encendido) */}
        <PrivacyFormNotice lang={language} />
        <button type="submit" className="mt-4 block w-full rounded-xl bg-[#C12909] px-5 py-4 text-center text-base font-bold text-white hover:opacity-90">
          Continuar &nbsp;→
        </button>
      </section>
    </form>
  );
}
