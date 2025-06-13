// components/SessionProvider.tsx
"use client";  // This is crucial

import { SessionProvider as AuthSessionProvider } from "next-auth/react";

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      {children}
    </AuthSessionProvider>
  );
}