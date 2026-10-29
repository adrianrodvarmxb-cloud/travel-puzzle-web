'use client';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/language-context';
import { CalendarAvailabilityService } from '@/lib/services/calendar/CalendarAvailabilityService';
import { PeopleSelector } from './PeopleSelector';
import { useBookingForm } from './Contexts';

interface EventDetailData {
  id: number;
  isAvailable: boolean;
  minAdultsPerBooking: number;
  availableAdultPlaces: number;
  fullPricePerGroup: Record<string, number>;
  payableNowPricePerGroup: Record<string, number>;
  isPartiallyPaid: boolean;
}

interface EventBookingFormProps {
  language: string;
  languageDisplayName: string;
  languageFlag: string;
  date: string;
  time: string;
  eventDetailData?: EventDetailData;
  isLoading?: boolean;
  error?: Error | null;
  onNext: () => void;
}

export function EventBookingForm({
  language,
  languageDisplayName,
  languageFlag,
  date,
  time,
  eventDetailData,
  isLoading = false,
  error,
  onNext,
}: EventBookingFormProps) {
  // Get the current language from context (reads from localStorage)
  const { language: currentLanguage } = useLanguage();

  // Get form state and handlers from booking context
  const { form, errors, handlers, isFormValid, submitError, isReady } = useBookingForm();

  // Don't render form until it's ready
  if (!isReady) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border-2 border-orange-500">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Cargando formulario...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate form before proceeding
    if (isFormValid()) {
      onNext();
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border-2 border-orange-500">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          Error al cargar los detalles del evento. Por favor, intenta de nuevo.
        </div>
      )}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {submitError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Tour Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">1. Detalles del tour</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium mb-2">Idioma</label>
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md">
                <span className="text-lg">{languageFlag}</span>
                <span>{languageDisplayName}</span>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Fecha del tour</label>
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md">
                <span>📅</span>
                <span className='capitalize'>{CalendarAvailabilityService.formatDateDisplay(date, currentLanguage)}</span>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium mb-2">Hora de inicio</label>
              <div className="px-4 py-2 bg-white border border-gray-300 rounded-md">
                <span>{time}</span>
              </div>
            </div>

            {/* Number of People */}
            <div>
              <PeopleSelector
                eventDetailData={eventDetailData}
                value={form.adults}
                onChange={(value) => handlers.adults(value)}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Your Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">2. Tus detalles</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <Input
                type="text"
                label={'Nombre'}
                value={form.customer.firstName}
                onChange={(e) => handlers.customer.firstName(e.target.value)}
                error={errors.customer?.firstName}
                required
                className="w-full"
              />
            </div>

            {/* Last Name */}
            <div>
              <Input
                type="text"
                label="Apellido"
                value={form.customer.lastName}
                onChange={(e) => handlers.customer.lastName(e.target.value)}
                error={errors.customer?.lastName}
                required
                className="w-full"
              />
            </div>

            {/* Email */}
            <div>
              <Input
                type="email"
                label="E-mail"
                value={form.customer.email}
                onChange={(e) => handlers.customer.email(e.target.value)}
                error={errors.customer?.email}
                required
                className="w-full"
              />
            </div>

            {/* Phone (optional) */}
            <div>
              <Input
                type="tel"
                label="Teléfono (opcional)"
                value={form.customer.phone || ''}
                onChange={(e) => handlers.customer.phone(e.target.value)}
                error={errors.customer?.phone}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" variant="accent">
            Continuar
          </Button>
        </div>
      </form>
    </div>
  );
}

