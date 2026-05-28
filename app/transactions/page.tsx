'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Receipt,
  Search,
  Printer,
  MessageCircle,
  X,
  ChevronRight,
  Download,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useStore } from '@/store/useStore';
import { Transaction, PaymentMethod } from '@/types/pos';
import { formatIDR } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportTransactionsToExcel, printTransactionsPDF, printThermalReceipt } from '@/lib/exportUtils';

const PAYMENT_BADGE: Record<string, string> = {
  QRIS: 'badge-indigo',
  Tunai: 'badge-success',
  'Debit/Kredit': 'badge-warning',
};

const STATUS_BADGE: Record<string, string> = {
  Sukses: 'badge-success',
  Pending: 'badge-warning',
  Gagal: 'badge-danger',
  Diretur: 'bg-destructive/20 text-destructive border border-destructive/30',
};

export default function TransactionsPage() {
  const { transactions, refundTransactionItem, outlets, currentUser, activeOutlet } = useStore();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('Semua');
  const [cashierFilter, setCashierFilter] = useState('Semua Kasir');
  const [outletFilter, setOutletFilter] = useState('All');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Refund states
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundItemId, setRefundItemId] = useState<string>('');
  const [refundQty, setRefundQty] = useState<number>(1);
  const [refundReason, setRefundReason] = useState<string>('');

  const [dateFilter, setDateFilter] = useState('Semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Reactive selected transaction lookup from store state
  const selectedTx = useMemo(() => {
    return transactions.find((tx) => tx.id === selectedTxId) || null;
  }, [transactions, selectedTxId]);

  // 2. Extract cashier list dynamically from transactions
  const cashierOptions = useMemo(() => {
    const list = new Set<string>();
    transactions.forEach(t => list.add(t.cashierName));
    return ['Semua Kasir', ...Array.from(list)];
  }, [transactions]);

  // 3. Filtered transactions list — sorted newest first
  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Multi-tenant outlet isolation based on user role
        if (currentUser?.role === 'Owner') {
          if (outletFilter !== 'All' && tx.outletId !== outletFilter) {
            return false;
          }
        } else {
          if (tx.outletId !== activeOutlet.id) {
            return false;
          }
        }

        const matchSearch =
          tx.id.toLowerCase().includes(search.toLowerCase()) ||
          tx.cashierName.toLowerCase().includes(search.toLowerCase());
        const matchPayment = paymentFilter === 'Semua' || tx.paymentMethod === paymentFilter;
        const matchCashier = cashierFilter === 'Semua Kasir' || tx.cashierName === cashierFilter;
        
        let matchDate = true;
        const txDate = new Date(tx.timestamp);
        const now = new Date();

        if (dateFilter === 'Hari Ini') {
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const end = new Date(now);
          end.setHours(23, 59, 59, 999);
          matchDate = txDate >= start && txDate <= end;
        } else if (dateFilter === 'Kemarin') {
          const start = new Date(now);
          start.setDate(now.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date(now);
          end.setDate(now.getDate() - 1);
          end.setHours(23, 59, 59, 999);
          matchDate = txDate >= start && txDate <= end;
        } else if (dateFilter === '7 Hari') {
          const start = new Date(now);
          start.setDate(now.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          matchDate = txDate >= start;
        } else if (dateFilter === '30 Hari') {
          const start = new Date(now);
          start.setDate(now.getDate() - 30);
          start.setHours(0, 0, 0, 0);
          matchDate = txDate >= start;
        } else if (dateFilter === 'Kustom') {
          const start = startDate ? new Date(startDate) : new Date(0);
          if (startDate) start.setHours(0, 0, 0, 0);
          const end = endDate ? new Date(endDate) : new Date();
          if (endDate) end.setHours(23, 59, 59, 999);
          matchDate = txDate >= start && txDate <= end;
        }

        return matchSearch && matchPayment && matchCashier && matchDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, search, paymentFilter, cashierFilter, dateFilter, startDate, endDate, currentUser, outletFilter, activeOutlet]);

  const totalRevenue = useMemo(() => {
    return filtered.reduce((s, tx) => {
      if (tx.status === 'Gagal') return s;
      return s + (tx.totalPaid - (tx.refundedAmount || 0));
    }, 0);
  }, [filtered]);

  // Reset to page 1 whenever filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // 4. Handle Opening Refund Dialog
  const handleOpenRefund = () => {
    if (!selectedTx) return;
    
    // Find first item eligible for refund
    const firstRefundableIdx = selectedTx.items.findIndex(
      (item) => item.quantity - (item.refundedQty || 0) > 0
    );

    if (firstRefundableIdx === -1) {
      toast.error('Seluruh barang dalam transaksi ini telah dikembalikan!');
      return;
    }

    const firstRefundableItem = selectedTx.items[firstRefundableIdx];
    setRefundItemId(`${firstRefundableItem.productId}-${firstRefundableIdx}`);
    setRefundQty(1);
    setRefundReason('');
    setRefundOpen(true);
  };

  const selectedRefundItem = useMemo(() => {
    if (!selectedTx || !refundItemId) return null;
    const parts = refundItemId.split('-');
    const prodId = parts[0];
    const idx = parseInt(parts[parts.length - 1], 10);
    const itemAtIndex = selectedTx.items[idx];
    if (itemAtIndex && itemAtIndex.productId === prodId) {
      return itemAtIndex;
    }
    return selectedTx.items.find(i => i.productId === prodId) || null;
  }, [selectedTx, refundItemId]);

  const maxRefundableQty = useMemo(() => {
    if (!selectedRefundItem) return 0;
    return selectedRefundItem.quantity - (selectedRefundItem.refundedQty || 0);
  }, [selectedRefundItem]);

  const handleConfirmRefund = () => {
    if (!selectedTx || !refundItemId) return;
    if (refundQty <= 0 || refundQty > maxRefundableQty) {
      toast.error('Jumlah pengembalian tidak valid!');
      return;
    }

    const parts = refundItemId.split('-');
    const prodId = parts[0];

    refundTransactionItem(selectedTx.id, prodId, refundQty, refundReason);
    toast.success(`Berhasil retur ${refundQty} pcs barang!`);
    setRefundOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'ID Transaksi',
      'Tanggal',
      'Outlet',
      'Kasir',
      'Metode Bayar',
      'Subtotal (IDR)',
      'Diskon (IDR)',
      'PPN (IDR)',
      'Total Bayar (IDR)',
      'Status',
      'Pelanggan / Member',
      'Kupon Promo',
      'Total Diretur (IDR)',
      'Net Bayar (IDR)'
    ];

    const rows = filtered.map((tx) => [
      tx.id,
      format(new Date(tx.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      `"${tx.outletName.replace(/"/g, '""')}"`,
      `"${tx.cashierName.replace(/"/g, '""')}"`,
      tx.paymentMethod,
      tx.subtotal,
      tx.discount,
      tx.taxAmount,
      tx.totalPaid,
      tx.status,
      tx.customerName ? `"${tx.customerName.replace(/"/g, '""')}"` : '-',
      tx.promoCode || '-',
      tx.refundedAmount || 0,
      tx.totalPaid - (tx.refundedAmount || 0),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KasirKu_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Daftar transaksi berhasil diekspor ke CSV!');
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) { toast.error('Tidak ada data transaksi untuk diekspor!'); return; }
    exportTransactionsToExcel(filtered, `KasirKu_Transaksi_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Data transaksi berhasil diekspor ke Excel (.xlsx)!');
  };

  const handlePrintPDF = () => {
    if (filtered.length === 0) { toast.error('Tidak ada data transaksi untuk dicetak!'); return; }
    printTransactionsPDF(filtered, 'Riwayat Transaksi KasirKu');
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Riwayat Transaksi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} transaksi · Total Pendapatan Netto {formatIDR(totalRevenue)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border/60 hover:border-primary/50 text-foreground text-xs font-semibold transition-all cursor-pointer"
          >
            <Download size={13} /> CSV
          </button>
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer"
          >
            <Download size={13} /> Excel (.xlsx)
          </button>
          <button
            id="btn-print-pdf"
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer"
          >
            <Printer size={13} /> Cetak PDF
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="transaction-search"
            placeholder="Cari ID transaksi atau kasir..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-10 bg-card border-border/60"
          />
        </div>

        <Select value={paymentFilter} onValueChange={(v) => { if (v) { setPaymentFilter(v); setCurrentPage(1); } }}>
          <SelectTrigger id="payment-filter" className="w-44 bg-card border-border/60">
            <SelectValue placeholder="Metode Bayar" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="Semua">Semua Metode</SelectItem>
            <SelectItem value="Tunai">Tunai</SelectItem>
            <SelectItem value="QRIS">QRIS</SelectItem>
            <SelectItem value="Debit/Kredit">Debit / Kredit</SelectItem>
          </SelectContent>
        </Select>

        {currentUser?.role === 'Owner' && (
          <Select value={outletFilter} onValueChange={(v) => { if (v) { setOutletFilter(v); setCurrentPage(1); } }}>
            <SelectTrigger id="outlet-filter" className="w-44 bg-card border-border/60">
              <SelectValue placeholder="Semua Outlet" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="All">Semua Outlet</SelectItem>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={cashierFilter} onValueChange={(v) => { if (v) { setCashierFilter(v); setCurrentPage(1); } }}>
          <SelectTrigger id="cashier-filter" className="w-44 bg-card border-border/60">
            <SelectValue placeholder="Kasir" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {cashierOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={(v) => { if (v) { setDateFilter(v); setCurrentPage(1); } }}>
          <SelectTrigger id="date-filter" className="w-44 bg-card border-border/60">
            <SelectValue placeholder="Tanggal" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="Semua">Semua Waktu</SelectItem>
            <SelectItem value="Hari Ini">Hari Ini</SelectItem>
            <SelectItem value="Kemarin">Kemarin</SelectItem>
            <SelectItem value="7 Hari">7 Hari Terakhir</SelectItem>
            <SelectItem value="30 Hari">30 Hari Terakhir</SelectItem>
            <SelectItem value="Kustom">Rentang Kustom</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === 'Kustom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-36 bg-card border-border/60 text-xs h-9"
            />
            <span className="text-xs text-muted-foreground">s/d</span>
            <Input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-36 bg-card border-border/60 text-xs h-9"
            />
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">ID Transaksi</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Waktu</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Outlet</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Kasir</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Metode</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-right">Total Netto</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Tidak ada transaksi ditemukan</p>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((tx) => {
                const netAmount = tx.totalPaid - (tx.refundedAmount || 0);
                return (
                  <TableRow
                    key={tx.id}
                    id={`tx-row-${tx.id}`}
                    className="border-border/30 hover:bg-secondary/20 cursor-pointer"
                    onClick={() => setSelectedTxId(tx.id)}
                  >
                    <TableCell className="font-mono text-sm font-bold text-primary">{tx.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(tx.timestamp), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell className="text-sm text-foreground max-w-[140px] truncate">
                      {tx.outletName}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{tx.cashierName}</TableCell>
                    <TableCell>
                      <Badge className={cn('border-0 text-xs', PAYMENT_BADGE[tx.paymentMethod])}>
                        {tx.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-bold text-foreground text-right pr-4">
                      {formatIDR(netAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-0 text-xs', STATUS_BADGE[tx.status])}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Menampilkan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length} transaksi
          </p>
          <div className="flex items-center gap-1">
            <button
              id="btn-page-prev"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 bg-card hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              ← Sebelumnya
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={p}
                    id={`btn-page-${p}`}
                    onClick={() => setCurrentPage(p as number)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      safePage === p
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'border border-border/60 bg-card hover:bg-secondary/40 text-foreground'
                    )}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              id="btn-page-next"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 bg-card hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}

      {/* ── Receipt Drawer ── */}
      <Sheet open={!!selectedTxId} onOpenChange={(open) => !open && setSelectedTxId(null)}>
        <SheetContent className="w-full sm:max-w-[380px] bg-card border-border/60 p-0 overflow-y-auto">
          {selectedTx && (
            <ReceiptPanel
              tx={selectedTx}
              onClose={() => setSelectedTxId(null)}
              onRefundClick={handleOpenRefund}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Return / Refund Dialog ── */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <RotateCcw className="w-5 h-5" /> Retur & Pengembalian Barang
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Proses pengembalian produk untuk transaksi ID: <span className="font-mono font-bold text-foreground">{selectedTx?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-4 py-3">
              {/* Product selector */}
              <div className="space-y-2">
                <Label htmlFor="refund-product" className="text-sm">Pilih Barang yang Dikembalikan</Label>
                <Select
                  value={refundItemId}
                  onValueChange={(val) => {
                    setRefundItemId(val || '');
                    setRefundQty(1);
                  }}
                >
                  <SelectTrigger id="refund-product" className="bg-background border-border/60 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {selectedTx.items.map((item, idx) => {
                      const netQty = item.quantity - (item.refundedQty || 0);
                      const itemVal = `${item.productId}-${idx}`;
                      const variantText = item.selectedVariant ? ` - ${item.selectedVariant.name}` : '';
                      return (
                        <SelectItem
                          key={itemVal}
                          value={itemVal}
                          disabled={netQty <= 0}
                        >
                          {item.productName}{variantText} ({netQty} pcs tersedia untuk retur)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity return selector */}
              {selectedRefundItem && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="refund-quantity" className="text-sm">Jumlah Retur (pcs)</Label>
                    <span className="text-xs text-muted-foreground font-mono">Maks: {maxRefundableQty} pcs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="w-10 h-10 border-border/60 cursor-pointer"
                      onClick={() => setRefundQty(Math.max(1, refundQty - 1))}
                      disabled={refundQty <= 1}
                    >
                      -
                    </Button>
                    <Input
                      id="refund-quantity"
                      type="number"
                      value={refundQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setRefundQty(Math.max(1, Math.min(val, maxRefundableQty)));
                      }}
                      className="text-center font-bold text-base bg-background border-border/60"
                    />
                    <Button
                      variant="outline"
                      className="w-10 h-10 border-border/60 cursor-pointer"
                      onClick={() => setRefundQty(Math.min(maxRefundableQty, refundQty + 1))}
                      disabled={refundQty >= maxRefundableQty}
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}

              {/* Reason / Notes */}
              <div className="space-y-2">
                <Label htmlFor="refund-reason" className="text-sm">Alasan Pengembalian</Label>
                <Input
                  id="refund-reason"
                  placeholder="Contoh: Barang cacat, Salah beli varian..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="bg-background border-border/60 text-xs"
                />
              </div>

              {/* Warnings and Info */}
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2 text-xs text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Konsekuensi Pengembalian:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    <li>Stok barang akan otomatis dipulihkan ke inventori.</li>
                    <li>Sistem mencatat mutasi masuk jenis <span className="font-mono">Retur Penjualan</span> di Kartu Stok.</li>
                    {selectedTx.paymentMethod === 'Tunai' && (
                      <li>Nominal kas laci shift aktif akan berkurang <span className="font-bold text-destructive">{formatIDR(selectedRefundItem ? selectedRefundItem.unitPrice * refundQty : 0)}</span>.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              id="btn-confirm-refund"
              onClick={handleConfirmRefund}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold"
            >
              Konfirmasi Retur & Refund
            </Button>
            <Button
              variant="outline"
              onClick={() => setRefundOpen(false)}
              className="border-border/60"
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Thermal Receipt Panel ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ReceiptPanel({
  tx,
  onClose,
  onRefundClick,
}: {
  tx: Transaction;
  onClose: () => void;
  onRefundClick: () => void;
}) {
  const { activeOutlet, businessProfile } = useStore();

  // Check if any items are available to refund
  const isRefundable = useMemo(() => {
    if (tx.status === 'Gagal' || tx.status === 'Diretur') return false;
    return tx.items.some((item) => item.quantity - (item.refundedQty || 0) > 0);
  }, [tx]);

  const handlePrintThermal = () => {
    printThermalReceipt(tx, {
      outletAddress: activeOutlet.address,
      outletPhone: activeOutlet.phone,
      receiptHeader: businessProfile.receiptHeader || '★ KASIRKU POS ★',
      receiptFooter: businessProfile.receiptFooter,
      paperWidth: '80mm',
    });
  };

  const handleSendWhatsApp = () => {
    const itemLines = tx.items
      .map(i => `  - ${i.productName} x${i.quantity} = ${formatIDR(i.subtotal)}`)
      .join('%0A');
    const msg =
      `*Struk Digital - ${tx.outletName}*%0A` +
      `No: ${tx.id}%0A` +
      `Tgl: ${new Date(tx.timestamp).toLocaleString('id-ID')}%0A` +
      `Kasir: ${tx.cashierName}%0A%0A` +
      `*Item:*%0A${itemLines}%0A%0A` +
      `Subtotal: ${formatIDR(tx.subtotal)}%0A` +
      (tx.discount > 0 ? `Diskon: -${formatIDR(tx.discount)}%0A` : '') +
      (tx.taxAmount > 0 ? `PPN: ${formatIDR(tx.taxAmount)}%0A` : '') +
      `*TOTAL: ${formatIDR(tx.totalPaid)}*%0A` +
      `Metode: ${tx.paymentMethod}%0A%0A` +
      `Terima Kasih! 🙏`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Detail Struk</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
          <X size={14} />
        </button>
      </div>

      {/* Receipt body — thermal style */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-white text-slate-900 rounded-xl p-5 font-mono text-[11px] shadow-xl" style={{ fontFamily: 'monospace' }}>
          {/* Header */}
          <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-4">
            <p className="font-bold text-base text-slate-900">{businessProfile.receiptHeader || 'KASIR KU'}</p>
            <p className="text-[10px] text-slate-500">{tx.outletName}</p>
            {activeOutlet.address && <p className="text-[9px] text-slate-400 mt-1">{activeOutlet.address}</p>}
            <p className="text-[10px] text-slate-400 mt-1">
              {format(new Date(tx.timestamp), 'dd/MM/yyyy HH:mm:ss')}
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">{tx.id}</p>
          </div>

          {/* Items */}
          <div className="mb-3 space-y-2">
            {tx.items.map((item, idx) => {
              const netQty = item.quantity - (item.refundedQty || 0);
              const uniqueKey = `${item.productId}-${idx}-${item.selectedVariant?.id || 'no-var'}`;
              return (
                <div key={uniqueKey} className="space-y-0.5">
                  <div className="font-semibold text-slate-900">{item.productName}</div>
                  {item.selectedVariant && (
                    <div className="text-[9px] text-slate-500 pl-2">Varian: {item.selectedVariant.name}</div>
                  )}
                  {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <div className="text-[9px] text-slate-500 pl-2">
                      - Mod: {item.selectedModifiers.map(m => m.name).join(', ')}
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>{netQty} x {formatIDR(item.unitPrice)}</span>
                    <span className="font-semibold text-slate-700">{formatIDR(item.subtotal)}</span>
                  </div>
                  {(item.refundedQty ?? 0) > 0 && (
                    <div className="text-[9px] text-rose-500 pl-2">*Diretur: {item.refundedQty} pcs</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-300 pt-3 space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatIDR(tx.subtotal)}</span>
            </div>
            {tx.taxAmount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>PPN ({(tx.taxRate * 100).toFixed(0)}%)</span>
                <span>{formatIDR(tx.taxAmount)}</span>
              </div>
            )}
            {tx.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Diskon</span>
                <span>- {formatIDR(tx.discount)}</span>
              </div>
            )}
            {tx.refundedAmount && tx.refundedAmount > 0 ? (
              <div className="flex justify-between text-rose-600 font-bold text-[10px] mt-1.5 pt-1.5 border-t border-dotted border-slate-300">
                <span>Total Diretur</span>
                <span>- {formatIDR(tx.refundedAmount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-dashed border-slate-300 pt-2 mt-2">
              <span>NET TOTAL</span>
              <span>{formatIDR(tx.totalPaid - (tx.refundedAmount || 0))}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="mt-3 pt-3 border-t border-dashed border-slate-300 text-center">
            <Badge className={cn('border text-[10px] px-2 py-0.5 mb-2', PAYMENT_BADGE[tx.paymentMethod])}>
              {tx.paymentMethod}
            </Badge>
            <p className="text-[10px] text-slate-400">Kasir: {tx.cashierName}</p>
            <p className="text-[10px] text-slate-400 mt-3">— {businessProfile.receiptFooter || 'Terima Kasih'} —</p>
            <p className="text-[10px] text-slate-300 mt-1">KasirKu v1.0 · kasirku.id</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="border-t border-border/40 p-5 space-y-2">
        {isRefundable && (
          <Button
            id="btn-refund-dialog"
            onClick={onRefundClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-medium text-sm transition-colors cursor-pointer"
          >
            ↩ Ajukan Retur Barang
          </Button>
        )}
        <button
          id="btn-print-receipt"
          onClick={handlePrintThermal}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary font-medium text-sm transition-colors cursor-pointer"
        >
          <Printer size={16} /> Cetak Struk (58mm / 80mm)
        </button>
        <button
          id="btn-whatsapp-receipt"
          onClick={handleSendWhatsApp}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success/15 hover:bg-success/25 text-success font-medium text-sm transition-colors cursor-pointer"
        >
          <MessageCircle size={16} /> Kirim via WhatsApp
        </button>
      </div>
    </div>
  );
}
