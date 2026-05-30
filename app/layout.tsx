import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'KasirKu — Multi-Outlet POS & Inventory SaaS',
  description:
    'Sistem kasir modern berbasis web untuk mengelola penjualan, stok barang, transaksi, dan laporan bisnis multi-outlet di Indonesia.',
  keywords: ['kasir', 'pos', 'inventory', 'point of sale', 'laporan', 'samarinda'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppShell>
            {children}
          </AppShell>
        </ThemeProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
