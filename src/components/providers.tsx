"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api/client";

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "on";

// Client-only: keeps msw/browser out of the server bundle. When mocking is off the chunk is never requested.
const MswStarter = dynamic(() => import("@/mocks/msw-starter"), { ssr: false });

/**
 * True once requests can be sent. With mocking on, that is after the MSW service worker has
 * started; otherwise immediately. Queries pass this as `enabled` so none slip past the mocks.
 */
const ApiReadyContext = createContext(!MOCKING);
export const useApiReady = () => useContext(ApiReadyContext);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => {
          // Don't retry what won't change on retry.
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
          return count < 2;
        },
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [apiReady, setApiReady] = useState(!MOCKING);
  const markReady = useCallback(() => setApiReady(true), []);

  return (
    <ApiReadyContext.Provider value={apiReady}>
      {MOCKING && !apiReady && <MswStarter onReady={markReady} />}
      <QueryClientProvider client={queryClient}>
        {children}
        <ImpersonationBanner />
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ApiReadyContext.Provider>
  );
}
