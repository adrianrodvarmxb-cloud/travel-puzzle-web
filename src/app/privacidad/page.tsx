import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { PRIVACIDAD_INTEGRAL } from '@/legal/lib/privacidad';
import { LEGAL_PATHS } from '@/legal/lib/labels';

// El footer y el WhatsApp leen variables del servidor en cada visita (igual que el home).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description: 'Aviso de privacidad integral de Travel Puzzle: qué datos usamos, para qué y cómo ejercer tus derechos ARCO.',
  alternates: { canonical: LEGAL_PATHS.privacy },
};

export default function PrivacidadPage() {
  return <LegalPage eyebrow="TRAVEL PUZZLE · LEGAL" title="Aviso de privacidad integral" markup={PRIVACIDAD_INTEGRAL} />;
}
