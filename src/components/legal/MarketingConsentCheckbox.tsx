import { MARKETING_CONSENT_COPY } from '@/legal/lib/marketing-consent';

interface MarketingConsentCheckboxProps {
    lang?: string;
    /** Controlado (opcional). Sin `checked` la casilla nace sin marcar. */
    checked?: boolean;
    onChange?: (checked: boolean) => void;
}

/**
 * REQ-084: casilla de marketing aparte, sin marcar y opcional (LFPDPPP).
 * Solo se pinta cuando MARKETING_CONSENT_ENABLED está encendida (lo decide quien la usa).
 */
export function MarketingConsentCheckbox({ lang = 'es', checked, onChange }: MarketingConsentCheckboxProps) {
    const copy = lang === 'en' ? MARKETING_CONSENT_COPY.en : MARKETING_CONSENT_COPY.es;
    const controlled = checked !== undefined ? { checked, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.checked) } : {};
    return (
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input id="marketingConsent" name="marketingConsent" type="checkbox" value="yes" className="mt-1 h-4 w-4 shrink-0" {...controlled} />
            <span>
                {copy.label}
                <span className="mt-1 block text-xs">{copy.hint}</span>
            </span>
        </label>
    );
}
