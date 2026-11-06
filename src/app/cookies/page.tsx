import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/legal/LegalPage';
import { POLITICA_COOKIES_BORRADOR, isCookiesPolicyEnabled } from '@/legal/lib/cookies';

// La bandera es una variable del servidor: se lee en cada visita.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Política de cookies',
    description: 'Qué cookies usa Travel Puzzle, para qué sirven y cómo desactivarlas.',
    alternates: { canonical: '/cookies' },
    robots: { index: false, follow: false },
};

/** REQ-084: política de cookies. Borrador tras COOKIES_POLICY_ENABLED (apagada): sin OK del PO y del abogado da 404. */
export default function CookiesPage() {
    if (!isCookiesPolicyEnabled(process.env.COOKIES_POLICY_ENABLED)) notFound();
    return <LegalPage eyebrow="TRAVEL PUZZLE · LEGAL" title="Política de cookies" markup={POLITICA_COOKIES_BORRADOR} />;
}
