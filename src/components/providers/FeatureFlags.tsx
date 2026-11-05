'use client';
import { createContext, useContext } from 'react';

/** Banderas que el servidor decide y la UI de cliente solo lee (DIP: el menú no lee process.env). */
export interface FeatureFlags { transfers: boolean }
const Ctx = createContext<FeatureFlags>({ transfers: false });

export function FeatureFlagsProvider({ flags, children }: { flags: FeatureFlags; children: React.ReactNode }) {
  return <Ctx.Provider value={flags}>{children}</Ctx.Provider>;
}
export const useFeatureFlags = () => useContext(Ctx);
