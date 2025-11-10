'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function GlobalSetup() {
  useEffect(() => {
    // Make toast available globally for the API client
    (window as any).toast = toast;
  }, []);

  return null;
}