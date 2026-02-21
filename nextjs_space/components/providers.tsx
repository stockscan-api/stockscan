'use client';

import { ReactNode, useState, useEffect } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { CurrencyProvider } from '@/contexts/currency-context';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <AuthProvider>
      <CurrencyProvider>
        {children}
        <Toaster position="top-right" />
      </CurrencyProvider>
    </AuthProvider>
  );
}
