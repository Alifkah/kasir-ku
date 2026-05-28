'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  Bell,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Home,
  Sun,
  Moon,
  Type,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BREADCRUMB_MAP: Record<string, string[]> = {
  '/dashboard': ['Dashboard'],
  '/pos': ['Dashboard', 'Point of Sale'],
  '/inventory': ['Dashboard', 'Barang & Stok'],
  '/transactions': ['Dashboard', 'Riwayat Transaksi'],
  '/customers': ['Dashboard', 'Pelanggan'],
  '/reports': ['Dashboard', 'Laporan'],
  '/expenses': ['Dashboard', 'Pengeluaran'],
  '/settings': ['Dashboard', 'Pengaturan'],
};

// Dynamic notification sync helper

export default function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, products, transactions, activeOutlet } = useStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLargeText = localStorage.getItem('accessibility-large-text') === 'true';
    setIsLargeText(savedLargeText);
    if (savedLargeText) {
      document.documentElement.classList.add('accessibility-large');
    }
  }, []);

  const toggleLargeText = () => {
    const newState = !isLargeText;
    setIsLargeText(newState);
    localStorage.setItem('accessibility-large-text', String(newState));
    if (newState) {
      document.documentElement.classList.add('accessibility-large');
      toast.success('Mode Teks Besar diaktifkan untuk kemudahan membaca');
    } else {
      document.documentElement.classList.remove('accessibility-large');
      toast.success('Kembali ke ukuran teks standar');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const breadcrumbs = BREADCRUMB_MAP[pathname] ?? ['Dashboard'];

  const dynamicNotifications = useMemo(() => {
    const list: { id: string; text: string; time: string; timestamp: Date; type: 'success' | 'warning' | 'danger' }[] = [];

    // 1. Check for low stock products in the active outlet
    const outletProducts = products.filter((p) => p.outletId === activeOutlet.id);
    outletProducts.forEach((p) => {
      if (p.stock === 0) {
        list.push({
          id: `low-stock-empty-${p.id}`,
          text: `Stok ${p.name} habis! Perlu restock segera`,
          time: 'Perlu restock',
          timestamp: new Date(Date.now() - 1000 * 60 * 2), // place at top
          type: 'danger',
        });
      } else if (p.stock <= p.minStock) {
        list.push({
          id: `low-stock-warning-${p.id}`,
          text: `Stok ${p.name} hampir habis (${p.stock} ${p.unit || 'pcs'} tersisa)`,
          time: 'Stok menipis',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          type: 'warning',
        });
      }
    });

    // 2. Add recent successful transactions in the active outlet
    const outletTransactions = transactions
      .filter((t) => t.outletId === activeOutlet.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    outletTransactions.forEach((tx) => {
      const txTime = new Date(tx.timestamp);
      const diffMs = Date.now() - txTime.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      let timeStr = '';
      if (diffMins < 1) timeStr = 'Baru saja';
      else if (diffMins < 60) timeStr = `${diffMins} mnt lalu`;
      else if (diffHours < 24) timeStr = `${diffHours} jam lalu`;
      else timeStr = txTime.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });

      list.push({
        id: `tx-${tx.id}`,
        text: `Transaksi #${tx.id} berhasil`,
        time: timeStr,
        timestamp: txTime,
        type: 'success',
      });
    });

    // Sort all notifications by timestamp descending (newest first)
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);
  }, [products, transactions, activeOutlet]);

  const handleSignOut = () => {
    logout();
    toast.success('Berhasil keluar dari sesi');
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-30 print:hidden">
      {/* ── Left: Breadcrumb ── */}
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm">
        <Home className="w-4 h-4 text-muted-foreground" />
        {breadcrumbs.map((crumb, idx) => (
          <span key={crumb} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
            <span
              className={
                idx === breadcrumbs.length - 1
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-3">
        {/* Online badge */}
        <div
          id="connectivity-badge"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-xs font-medium text-success"
        >
          <span className="w-2 h-2 rounded-full bg-success pulse-emerald" />
          Online Mode
        </div>

        {/* Accessibility Large Text Toggle */}
        <button
          onClick={toggleLargeText}
          className={`w-9 h-9 flex flex-col items-center justify-center rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer relative ${
            isLargeText ? 'text-primary bg-primary/10 border border-primary/20' : 'text-muted-foreground hover:text-foreground'
          }`}
          title={isLargeText ? 'Kembali ke Ukuran Teks Standar' : 'Aktifkan Ukuran Teks Besar (Untuk Lansia)'}
        >
          <Type size={18} />
          <span className="text-[8px] font-bold absolute bottom-0.5 right-0.5">
            {isLargeText ? 'A+' : 'A'}
          </span>
        </button>

        {/* Theme Switcher */}
        {mounted ? (
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Aktifkan Mode Terang (Light Mode)' : 'Aktifkan Mode Gelap (Dark Mode)'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-secondary/40 animate-pulse" />
        )}

        {/* Notification bell */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="btn-notifications"
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Bell size={18} />
            {dynamicNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover border-border p-0">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <span className="font-semibold text-sm">Notifikasi</span>
              {dynamicNotifications.length > 0 && (
                <Badge variant="outline" className="text-xs badge-danger border-0 flash-danger">
                  {dynamicNotifications.length} baru
                </Badge>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {dynamicNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                  Tidak ada notifikasi baru
                </div>
              ) : (
                dynamicNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (notif.id.startsWith('tx-')) {
                        router.push('/transactions');
                      } else if (notif.id.startsWith('low-stock-')) {
                        router.push('/inventory');
                      }
                    }}
                    className="px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/20 last:border-0 cursor-pointer"
                  >
                    <p className="text-sm text-foreground leading-snug flex items-start gap-2">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        notif.type === 'success' && 'bg-success',
                        notif.type === 'warning' && 'bg-warning',
                        notif.type === 'danger' && 'bg-destructive'
                      )} />
                      <span>{notif.text}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 pl-3.5">{notif.time}</p>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 text-center border-t border-border/40">
              <button className="text-xs text-primary hover:underline">Lihat semua notifikasi</button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="btn-user-profile"
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <Avatar className="w-8 h-8 border border-primary/30">
              {currentUser?.avatarUrl && (
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
              )}
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold animate-glow">
                {currentUser ? getInitials(currentUser.name) : 'KU'}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-tight">
                {currentUser?.name || 'Guest'}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {currentUser?.role === 'Owner' ? 'Owner' : 'Kasir'}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">Akun Saya</div>
            <div className="-mx-1 my-1 h-px bg-border" />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
              <User className="w-4 h-4 mr-2" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4 mr-2" /> Pengaturan
            </DropdownMenuItem>
            <div className="-mx-1 my-1 h-px bg-border" />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
