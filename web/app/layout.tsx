import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';

import { Toaster } from 'sonner';
import { GlobalSetup } from '@/components/GlobalSetup';

export const metadata: Metadata = {
  title: 'ElectraGH - Secure Digital Voting Platform',
  description: 'ElectraGH is Ghana\'s premier digital voting platform offering secure, transparent, and efficient electoral processes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <GlobalSetup />
        <AuthProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </AuthProvider>
        <Toaster closeButton position="top-right" richColors />
      </body>
    </html>
  );
}
