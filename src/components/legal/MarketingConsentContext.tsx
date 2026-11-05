'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** REQ-084: MARKETING_CONSENT_ENABLED la decide el servidor y llega a los formularios por contexto. */
const MarketingConsentFlag = createContext(false);

export function MarketingConsentFlagProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
    return <MarketingConsentFlag.Provider value={enabled}>{children}</MarketingConsentFlag.Provider>;
}

export function useMarketingConsentEnabled(): boolean {
    return useContext(MarketingConsentFlag);
}
