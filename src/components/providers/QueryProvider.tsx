'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
  /**
   * En desuso (REQ-10946): ya no recrea el cliente. Las 9 consultas del sitio fijan su propio `enabled`,
   * así que el `enabled: isReady` por defecto nunca aplicaba; solo tiraba la caché al terminar la detección
   * del idioma. Se conserva para no romper a quien lo pase.
   */
  isReady?: boolean;
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

// REQ-10946 (ola 15, REQ-1562): un solo QueryClient por montaje del proveedor. Antes `isReady` estaba en las
// dependencias del `useMemo`: al detectar el idioma se creaba otro cliente, las consultas ya montadas seguían en
// el viejo, lo montado después volvía a pedir sus datos y `useQueryClient()` invalidaba la caché equivocada.
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(makeClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
