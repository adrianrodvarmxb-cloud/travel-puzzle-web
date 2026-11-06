import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { TERMINOS } from '@/legal/lib/terminos';
import { LEGAL_PATHS } from '@/legal/lib/labels';
import { geoAttributionFor } from '@/geo/lib/attribution';
import { GeoAttribution } from '@/components/legal/GeoAttribution';

// El footer y el WhatsApp leen variables del servidor en cada visita (igual que el home).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Términos y condiciones de uso de travelpuzzle.com.mx y de los tours que ofrece Travel Puzzle.',
  alternates: { canonical: LEGAL_PATHS.terms },
};

export default function TerminosPage() {
  // REQ-139 (gate G5): atribución de GeoNames solo aquí, tras GEO_ATTRIBUTION_ENABLED (apagada).
  const geo = geoAttributionFor(LEGAL_PATHS.terms, process.env as { GEO_ATTRIBUTION_ENABLED?: string });
  return <LegalPage eyebrow="TRAVEL PUZZLE · LEGAL" title="Términos y condiciones" markup={TERMINOS} after={<GeoAttribution items={geo} />} />;
}
