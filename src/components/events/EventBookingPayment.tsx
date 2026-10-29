'use client';

import { ChevronLeftIcon } from "@/assets/svg";
import { Button } from "../ui";

interface EventBookingPaymentProps {
  onBack: () => void;
}

export function EventBookingPayment({ onBack }: EventBookingPaymentProps) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg border-2 border-orange-500">
      <div className="v-center-normal gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeftIcon className="w-4 h-4" />
          Anterior
        </Button>
        <h2 className="text-lg font-semibold">Pago</h2>
      </div>
      <p>Componente de pago - En desarrollo</p>
    </div>
  );
}

