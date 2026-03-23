import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from "@/lib/adminQueryDefaults";

/** App-wide client — also used from pwezaStore to sync prefetch into the same cache as useQuery. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      /** Align with accountant admin surfaces (~2 min); routes may override. */
      staleTime: ADMIN_STALE_TIME_MS,
      gcTime: ADMIN_GC_TIME_MS,
      retry: 1,
      refetchOnMount: true,
    },
  },
});

export function ReactQueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
