'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page has been deprecated in v1.14.1.
// Stock transfer signatures are now handled via the unified Deliveries system.
// Redirect to deliveries page.
export default function StockTransferDetailRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/deliveries');
  }, [router]);

  return null;
}
