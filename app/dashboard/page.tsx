'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Store,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { formatIDR } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const { products, transactions, expenses, activeOutlet, customers } = useStore();

  // Filter items by active outlet
  const outletTransactions = useMemo(() => {
    return transactions.filter((t) => t.outletId === activeOutlet.id);
  }, [transactions, activeOutlet]);

  // 2. Generate dynamic chart data for Weekly Sales
  const weeklySalesChartData = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const dayOffset = currentDay === 0 ? 6 : currentDay - 1;

    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - dayOffset);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 7);

    const startOfPreviousWeek = new Date(startOfCurrentWeek);
    startOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 7);

    const endOfPreviousWeek = new Date(startOfCurrentWeek);

    const daysOfWeek = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    const getDayIndex = (date: Date) => {
      const day = date.getDay();
      return day === 0 ? 6 : day - 1;
    };

    const currentWeekTx = outletTransactions.filter(tx => {
      const date = new Date(tx.timestamp);
      return date >= startOfCurrentWeek && date < endOfCurrentWeek && tx.status !== 'Gagal';
    });

    const previousWeekTx = outletTransactions.filter(tx => {
      const date = new Date(tx.timestamp);
      return date >= startOfPreviousWeek && date < endOfPreviousWeek && tx.status !== 'Gagal';
    });

    return daysOfWeek.map((dayName, idx) => {
      const currentTxs = currentWeekTx.filter(t => getDayIndex(new Date(t.timestamp)) === idx);
      const prevTxs = previousWeekTx.filter(t => getDayIndex(new Date(t.timestamp)) === idx);

      const currentVal = currentTxs.reduce((sum, tx) => sum + (tx.totalPaid - (tx.refundedAmount || 0)), 0);
      const prevVal = prevTxs.reduce((sum, tx) => sum + (tx.totalPaid - (tx.refundedAmount || 0)), 0);

      return {
        day: dayName,
        currentWeek: currentVal,
        previousWeek: prevVal,
      };
    });
  }, [outletTransactions]);

  const outletExpenses = useMemo(() => {
    return expenses.filter((e) => e.outletId === activeOutlet.id);
  }, [expenses, activeOutlet]);

  // 1. KPI Calculations
  const revenueTotal = useMemo(() => {
    return outletTransactions.reduce((sum, t) => sum + t.totalPaid, 0);
  }, [outletTransactions]);

  const grossProfitTotal = useMemo(() => {
    return outletTransactions.reduce((sum, t) => {
      const hppSum = t.items.reduce((acc, item) => acc + item.hpp * item.quantity, 0);
      return sum + (t.subtotal - hppSum);
    }, 0);
  }, [outletTransactions]);

  const totalExpense = useMemo(() => {
    return outletExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [outletExpenses]);

  // Low stock products count
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.outletId === activeOutlet.id && p.stock <= p.minStock).length;
  }, [products, activeOutlet]);

  const lowStockItems = useMemo(() => {
    return products
      .filter((p) => p.outletId === activeOutlet.id && p.stock <= p.minStock)
      .slice(0, 3);
  }, [products, activeOutlet]);

  // Recent transactions list
  const recentTransactions = useMemo(() => {
    return outletTransactions.slice(0, 4);
  }, [outletTransactions]);

  // Fast action options
  const FAST_ACTIONS = [
    {
      title: 'Point of Sale',
      desc: 'Buka mesin kasir POS',
      href: '/pos',
      icon: ShoppingCart,
      color: 'bg-primary/10 text-primary border-primary/20',
      btnText: 'Mulai Kasir',
    },
    {
      title: 'Tambah Barang',
      desc: 'Masukkan produk baru',
      href: '/inventory',
      icon: Package,
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      btnText: 'Stok Baru',
    },
    {
      title: 'Pelanggan Baru',
      desc: 'Daftarkan member loyalitas',
      href: '/customers',
      icon: Users,
      color: 'bg-success/10 text-success border-success/20',
      btnText: 'Member Baru',
    },
    {
      title: 'Catat Biaya',
      desc: 'Input pengeluaran operasional',
      href: '/expenses',
      icon: Wallet,
      color: 'bg-destructive/10 text-destructive border-destructive/20',
      btnText: 'Catat Operasional',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Dashboard Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ringkasan Bisnis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau ringkasan performa penjualan dan operasional {activeOutlet.name}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-secondary/50 border border-border/40 text-xs text-muted-foreground">
          <Store className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Outlet Manager: <strong className="text-foreground">{activeOutlet.manager}</strong></span>
        </div>
      </div>

      {/* ── Low-Stock Alert Banner ── */}
      {lowStockCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20 text-destructive shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Peringatan: Kritis! Ada stok produk yang hampir habis atau kosong</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sebanyak <strong className="text-destructive font-bold">{lowStockCount} produk</strong> berada di bawah batas minimum stok. Silakan lakukan pengadaan atau koreksi stok segera.
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/inventory')}
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/95 text-white gap-1.5 shrink-0 shadow-lg cursor-pointer text-xs font-semibold"
          >
            Kelola & Restock
            <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground truncate">{formatIDR(revenueTotal)}</p>
          <div className="flex items-center gap-1 text-[11px] text-success mt-1.5">
            <TrendingUp size={12} />
            <span>+14.2% dari kemarin</span>
          </div>
        </div>

        {/* Profits */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">Laba Kotor</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-success/10 border border-success/20">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground truncate">{formatIDR(grossProfitTotal)}</p>
          <div className="flex items-center gap-1 text-[11px] text-success mt-1.5">
            <TrendingUp size={12} />
            <span>+8.4% bulan ini</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/10 border border-destructive/20">
              <Wallet className="w-4 h-4 text-destructive" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground truncate">{formatIDR(totalExpense)}</p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
            <span>{outletExpenses.length} pencatatan aktif</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="metric-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">Peringatan Stok</span>
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border',
              lowStockCount > 0
                ? 'bg-destructive/10 text-destructive border-destructive/20'
                : 'bg-success/10 text-success border-success/20'
            )}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{lowStockCount} Item</p>
          <div className="flex items-center gap-1 text-[11px] mt-1.5">
            {lowStockCount > 0 ? (
              <span className="text-destructive font-semibold">Perlu restock segera!</span>
            ) : (
              <span className="text-success">Semua stok aman</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Layout Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Col: Chart & Fast Actions */}
        <div className="xl:col-span-2 space-y-6">
          {/* Sales Chart */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Tren Grafik Penjualan Mingguan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Analisis pendapatan toko per hari</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border/60"
                onClick={() => router.push('/reports')}
              >
                Laporan Lengkap <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={weeklySalesChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenueCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRevenuePrevious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'oklch(0.175 0.008 264)',
                    border: '1px solid oklch(0.28 0.012 264 / 60%)',
                    borderRadius: '0.75rem',
                    color: '#f1f5f9',
                  }}
                  formatter={(v, name) => [formatIDR(Number(v)), name === 'currentWeek' ? 'Minggu Ini' : 'Minggu Lalu']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                  formatter={(val) => val === 'currentWeek' ? 'Minggu Ini' : 'Minggu Lalu'}
                />
                <Area
                  type="monotone"
                  dataKey="currentWeek"
                  name="currentWeek"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradRevenueCurrent)"
                  dot={{ fill: '#6366f1', r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="previousWeek"
                  name="previousWeek"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="url(#gradRevenuePrevious)"
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions Panel */}
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-3">Akses Aksi Cepat</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {FAST_ACTIONS.map(({ title, desc, href, icon: Icon, color, btnText }) => (
                <div key={title} className="rounded-xl border border-border/40 bg-card p-4 flex flex-col justify-between h-36">
                  <div className="space-y-2">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border', color)}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(href)}
                    className="w-full text-[10px] py-1 h-7 bg-secondary hover:bg-secondary/80 text-foreground border border-border/40 font-semibold cursor-pointer"
                  >
                    {btnText}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Recent Transactions & Alerts */}
        <div className="space-y-6">
          {/* Alerts: Low Stock */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Peringatan Stok Menipis
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Segera hubungi supplier restocking</p>
            </div>
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 rounded-lg bg-zinc-950/40 border border-border/20 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="border-0 bg-destructive/15 text-destructive py-0.5 px-2">
                        Stok: {item.stock} pcs
                      </Badge>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Min: {item.minStock} pcs</p>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  onClick={() => router.push('/inventory')}
                  className="w-full text-xs text-primary hover:underline h-8 cursor-pointer"
                >
                  Kelola Stok <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-success/5 border border-success/15 text-center text-xs text-success">
                Stok barang aman, tidak ada alert hari ini.
              </div>
            )}
          </div>

          {/* Recent transactions Feed */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-primary" />
                  Transaksi Terbaru
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Daftar struk terbit hari ini</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push('/transactions')}
                className="text-xs text-primary hover:underline h-8 p-0 cursor-pointer"
              >
                Semua
              </Button>
            </div>

            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="p-3 rounded-lg bg-zinc-950/40 border border-border/20 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">{tx.id.split('-').slice(2).join('-')}</span>
                      <Badge className="border-0 bg-success/10 text-success text-[9px] px-1 py-0 h-4">
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {tx.cashierName} · {tx.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatIDR(tx.totalPaid)}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
