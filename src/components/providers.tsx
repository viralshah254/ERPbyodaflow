"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useState } from "react";
import { AuthRestore } from "@/components/auth/auth-restore";
import { FirebaseClientInit } from "@/components/firebase-client-init";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { AccessibilityWidget } from "@/components/accessibility/AccessibilityWidget";

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
        <AccessibilityProvider>
          <div className="app-providers-root">
            <AuthRestore />
            <FirebaseClientInit />
            {children}
            <Toaster position="bottom-right" richColors />
            <AccessibilityWidget />
          </div>
        </AccessibilityProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

