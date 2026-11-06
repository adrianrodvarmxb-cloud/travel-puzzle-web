'use client';
import { createContext, useContext } from 'react';
import type { SitePages } from '@/site/lib/pages';

/** Banderas que el servidor decide y la UI de cliente solo lee (DIP: el menú no lee process.env). */
export interface FeatureFlags {
  transfers: boolean;
  ownTrips?: boolean;
  primeraPieza?: boolean;
  /** REQ-241: páginas institucionales encendidas (enlaces del pie). */
  pages?: Partial<SitePages>;
  /** D9 (INC-001): año del pie calculado en el servidor, para que el cliente no use Date al pintar. */
  year?: number;
}
const Ctx = createContext<FeatureFlags>({ transfers: false, ownTrips: false, primeraPieza: false });

export function FeatureFlagsProvider({ flags, children }: { flags: FeatureFlags; children: React.ReactNode }) {
  return <Ctx.Provider value={flags}>{children}</Ctx.Provider>;
}
export const useFeatureFlags = () => useContext(Ctx);
