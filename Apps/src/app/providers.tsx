"use client";

import { ReduxProvider } from "@/lib/providers/ReduxProvider";
import { ThemeProvider } from "@/lib/providers/ThemeProvider";
import { IntlProvider } from "@/lib/providers/IntlProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider>
      <ThemeProvider>
        <IntlProvider>{children}</IntlProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
