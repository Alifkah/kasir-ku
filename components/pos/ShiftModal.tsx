'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { formatIDR } from '@/data/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet, AlertTriangle, CheckCircle2, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface ShiftModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'open' | 'close';
}

export default function ShiftModal({ isOpen, onOpenChange, mode }: ShiftModalProps) {
  const { activeShift, openShift, closeShift, currentUser } = useStore();
  const [cashAmount, setCashAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Reset inputs when modal state or mode changes
  useEffect(() => {
    setCashAmount('');
    setNotes('');
  }, [isOpen, mode]);

  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(cashAmount.replace(/\D/g, ''), 10);
    if (isNaN(amount) || amount < 0) {
      toast.error('Modal awal laci harus angka valid');
      return;
    }
    openShift(amount);
    toast.success('Shift berhasil dibuka! Selamat bekerja.');
    onOpenChange(false);
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(cashAmount.replace(/\D/g, ''), 10);
    if (isNaN(amount) || amount < 0) {
      toast.error('Jumlah uang fisik laci harus angka valid');
      return;
    }
    closeShift(amount, notes);
    const expected = activeShift?.expectedCash || 0;
    const diff = amount - expected;

    if (diff === 0) {
      toast.success('Shift berhasil ditutup! Kas cocok.');
    } else if (diff > 0) {
      toast.warning(`Shift ditutup dengan kelebihan kas sebesar ${formatIDR(diff)}`);
    } else {
      toast.error(`Shift ditutup dengan selisih kurang kas sebesar ${formatIDR(Math.abs(diff))}`);
    }
    onOpenChange(false);
  };

  const isForceBlock = mode === 'open' && currentUser?.role === 'Cashier' && !activeShift;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Prevent manual closing if shift opening is forced
        if (isForceBlock) return;
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <div className="mx-auto my-2 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {mode === 'open' ? (
              <Wallet className="w-6 h-6 text-primary" />
            ) : (
              <Clock className="w-6 h-6 text-indigo-500" />
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {mode === 'open' ? 'Buka Shift Kasir Baru' : 'Tutup Shift Sesi Kerja'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {mode === 'open' 
              ? 'Input jumlah modal uang tunai awal yang ada di dalam laci kas sekarang.'
              : 'Verifikasi jumlah uang tunai fisik yang tersisa di laci saat ini.'
            }
          </DialogDescription>
        </DialogHeader>

        {mode === 'open' ? (
          <form onSubmit={handleOpenShiftSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="initial-cash" className="text-xs font-semibold text-muted-foreground">
                Uang Modal Awal (Laci)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">Rp</span>
                <Input
                  id="initial-cash"
                  placeholder="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value.replace(/\D/g, ''))}
                  className="pl-9 bg-background/50 border-border/60 text-lg font-bold text-primary focus:border-primary/50"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                * Pastikan nominal cocok dengan isi fisik laci kasir sebelum melayani transaksi.
              </p>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all shadow-lg glow-primary cursor-pointer text-sm"
            >
              Mulai Sesi Shift & Buka POS
            </button>
          </form>
        ) : (
          <form onSubmit={handleCloseShiftSubmit} className="space-y-4 pt-2">
            {/* Shift Summary info */}
            {activeShift && (
              <div className="p-3.5 rounded-lg bg-zinc-950/40 border border-border/30 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Nama Kasir:</span>
                  <span className="font-semibold text-foreground">{activeShift.cashierName}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Modal Awal:</span>
                  <span className="font-semibold text-foreground">{formatIDR(activeShift.initialCash)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Ekspektasi Uang Laci:</span>
                  <span className="font-semibold text-primary">{formatIDR(activeShift.expectedCash)}</span>
                </div>
                <div className="h-px bg-border/20 my-1.5" />
                <p className="text-[10px] text-muted-foreground text-center">
                  * Ekspektasi Uang Laci = Modal Awal + Penjualan Tunai
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="actual-cash" className="text-xs font-semibold text-muted-foreground">
                Uang Fisik Laci (Uang Nyata)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">Rp</span>
                <Input
                  id="actual-cash"
                  placeholder="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value.replace(/\D/g, ''))}
                  className="pl-9 bg-background/50 border-border/60 text-lg font-bold text-indigo-500 focus:border-indigo-500/50"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Live discrepancy calculation */}
            {cashAmount && activeShift && (
              (() => {
                const entered = parseInt(cashAmount, 10) || 0;
                const expected = activeShift.expectedCash;
                const diff = entered - expected;
                return (
                  <div className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
                    diff === 0 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                      : diff > 0 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                        : 'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}>
                    {diff === 0 ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Sempurna! Selisih kas cocok.</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        <span>
                          {diff > 0 
                            ? `Surplus/Kelebihan kas sebesar ${formatIDR(diff)}`
                            : `Defisit/Kekurangan kas sebesar ${formatIDR(Math.abs(diff))}`
                          }
                        </span>
                      </>
                    )}
                  </div>
                );
              })()
            )}

            <div className="space-y-1.5">
              <Label htmlFor="close-notes" className="text-xs font-semibold text-muted-foreground">
                Catatan Shift / Keterangan
              </Label>
              <Input
                id="close-notes"
                placeholder="Tulis alasan jika kas selisih..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background/50 border-border/60 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg glow-indigo cursor-pointer text-sm"
            >
              Verifikasi & Tutup Shift
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
