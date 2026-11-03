import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { TERMINOS } from '@/legal/lib/terminos';
import { LEGAL_PATHS } from '@/legal/lib/labels';

// El footer y el WhatsApp leen variables del servidor en cada visita (igual que el home).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Términos y condiciones de uso de travelpuzzle.com.mx y de los tours que ofrece Travel Puzzle.',
  alternates: { canonical: LEGAL_PATHS.terms },
};

export default function TerminosPage() {
  return <LegalPage eyebrow="TRAVEL PUZZLE · LEGAL" title="Términos y condiciones" markup={TERMINOS} />;
}
