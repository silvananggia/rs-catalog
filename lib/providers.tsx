"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/lib/toast-context";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <CartProvider>
        <ToastProvider>{children}</ToastProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}
