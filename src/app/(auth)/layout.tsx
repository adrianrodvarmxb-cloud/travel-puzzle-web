import { notFound } from 'next/navigation';
import { ACCOUNTS_ENABLED } from '@/lib/features';
import { isMarketingConsentEnabled } from '@/legal/lib/marketing-consent';
import { MarketingConsentFlagProvider } from '@/components/legal/MarketingConsentContext';

/** Iniciar sesión y registro quedan ocultos hasta que existan las cuentas de cliente. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    if (!ACCOUNTS_ENABLED) notFound();
    // REQ-084: casilla de marketing separada, tras MARKETING_CONSENT_ENABLED (apagada).
    return <MarketingConsentFlagProvider enabled={isMarketingConsentEnabled(process.env.MARKETING_CONSENT_ENABLED)}>{children}</MarketingConsentFlagProvider>;
}
