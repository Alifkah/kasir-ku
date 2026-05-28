'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  BarChart3,
  Wallet,
  Settings,
  Store,
  ChevronDown,
  LogOut,
  Clock,
  Truck,
  Shield,
  X,
} from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasPermission } from '@/lib/acl';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', sublabel: 'Ringkasan Bisnis', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', sublabel: 'Halaman Kasir', icon: ShoppingCart },
  { href: '/inventory', label: 'Barang & Stok', sublabel: 'Manajemen Inventori', icon: Package },
  { href: '/purchase', label: 'Supplier & PO', sublabel: 'Manajemen PO & Supplier', icon: Truck },
  { href: '/transactions', label: 'Riwayat Transaksi', sublabel: 'Histori Pembayaran', icon: Receipt },
  { href: '/customers', label: 'Pelanggan', sublabel: 'Manajemen Member', icon: Users },
  { href: '/staff', label: 'Staf & Hak Akses', sublabel: 'Manajemen ACL Staf', icon: Shield },
  { href: '/reports', label: 'Laporan', sublabel: 'Analitik & BI', icon: BarChart3 },
  { href: '/expenses', label: 'Pengeluaran', sublabel: 'Pencatatan Biaya', icon: Wallet },
  { href: '/settings', label: 'Pengaturan', sublabel: 'Konfigurasi Sistem', icon: Settings },
];

export default function Sidebar({ showCloseButton = false }: { showCloseButton?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { outlets, activeOutlet, setActiveOutlet, currentUser, logout, activeShift } = useStore();

  const handleSignOut = () => {
    logout();
    toast.success('Berhasil keluar dari sesi');
    router.push('/login');
  };

  // Filter links by permissions
  const visibleLinks = NAV_LINKS.filter(({ href }) => {
    if (href === '/reports') return hasPermission(currentUser, 'view_reports');
    if (href === '/expenses') return hasPermission(currentUser, 'manage_expenses');
    if (href === '/purchase') return hasPermission(currentUser, 'manage_suppliers_po');
    if (href === '/settings') return hasPermission(currentUser, 'manage_settings');
    if (href === '/staff') return hasPermission(currentUser, 'manage_staff');
    return true;
  });

  return (
    <aside className="flex flex-col h-full w-full border-r border-border/60 bg-sidebar print:hidden">
      {/* ── Brand Header ── */}
      <div className="px-4 pt-6 pb-4 border-b border-border/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg glow-primary shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground tracking-tight">Kasir Ku</h1>
            <p className="text-xs text-muted-foreground">Multi-Outlet POS</p>
          </div>
        </div>

        {showCloseButton && (
          <SheetClose render={
            <button className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors shadow-sm shrink-0" title="Tutup Menu">
              <X className="w-4 h-4" />
            </button>
          } />
        )}
      </div>

      <div className="px-4 pt-4 pb-4 border-b border-border/40">
        {/* Outlet Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="outlet-selector"
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors text-left group cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Outlet Aktif</p>
              <p className="text-sm font-medium text-foreground truncate leading-tight">
                {activeOutlet.name}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 bg-popover border-border">
            {outlets.map((outlet) => (
              <DropdownMenuItem
                key={outlet.id}
                id={`outlet-option-${outlet.id}`}
                onClick={() => setActiveOutlet(outlet)}
                className={cn(
                  'cursor-pointer',
                  outlet.id === activeOutlet.id && 'text-primary bg-primary/10'
                )}
              >
                <div>
                  <p className="font-medium text-sm">{outlet.name}</p>
                  <p className="text-xs text-muted-foreground">{outlet.staffCount} staf aktif</p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Navigation Links ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleLinks.map(({ href, label, sublabel, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              id={`nav-${href.replace('/', '')}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-primary/15 text-primary border-l-[3px] border-primary pl-[calc(0.75rem-3px)]'
                  : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'w-4.5 h-4.5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
                size={18}
              />
              <div className="min-w-0">
                <p className="leading-tight">{label}</p>
                {!isActive && (
                  <p className="text-[11px] text-muted-foreground/60 leading-tight hidden group-hover:block">
                    {sublabel}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-4 py-4 border-t border-border/40 space-y-3">
        {/* Shift status */}
        {currentUser?.role === 'Cashier' ? (
          activeShift ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Shift Aktif</p>
                <p className="text-sm font-semibold text-emerald-500 leading-tight truncate">
                  {currentUser.name}
                </p>
              </div>
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Shift Status</p>
                <p className="text-sm font-semibold text-amber-500 leading-tight truncate">
                  Belum Buka Shift
                </p>
              </div>
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </div>
          )
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Mode Owner</p>
              <p className="text-sm font-semibold text-indigo-500 leading-tight truncate">
                {currentUser?.name || 'Owner'}
              </p>
            </div>
            <Store className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
        )}

        {/* Sign out */}
        <button
          id="btn-signout"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Sesi</span>
        </button>
      </div>
    </aside>
  );
}

