"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { AuthRestore } from "@/components/auth/auth-restore";
import { useOrgContextStore } from "@/stores/orgContextStore";

function StoreHydrator() {
  useEffect(() => {
    useOrgContextStore.persist.rehydrate();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        <StoreHydrator />
        <AuthRestore />
        {children}
        <Toaster position="bottom-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

