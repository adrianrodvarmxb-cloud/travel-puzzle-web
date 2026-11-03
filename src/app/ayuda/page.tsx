import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HelpPage } from '@/components/help/HelpPage';
import { HELP_PATH, isHelpVisible } from '@/help/lib/faq';

// El interruptor y el WhatsApp se leen del servidor en cada visita.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Centro de ayuda',
  description: 'Respuestas sobre reservas, cancelaciones y el día de tu tour con Travel Puzzle.',
  alternates: { canonical: HELP_PATH },
};

/** Visible solo con BOOKINGS_ENABLED="true": las respuestas describen reservas y cancelación en línea. */
export default function AyudaPage() {
  if (!isHelpVisible(process.env.BOOKINGS_ENABLED)) notFound();
  return <HelpPage />;
}
