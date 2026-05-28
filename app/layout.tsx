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
