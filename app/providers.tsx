'use client';

import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { CLINICAL_STALE_TIMES, CLINICAL_GC_TIMES } from '@/lib/query-config';

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CLINICAL_STALE_TIMES.STANDARD,
            gcTime: CLINICAL_GC_TIMES.STANDARD,
            refetchOnWindowFocus: true, // Integridad médica: revalidar al regresar a la pestaña
            refetchOnReconnect: true,
            retry: (failureCount, error: any) => {
              const status = error?.response?.status;
              // No reintentar ante errores de autenticación o cliente
              if (status === 401 || status === 403 || status === 404) return false;
              return failureCount < 1;
            },
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
