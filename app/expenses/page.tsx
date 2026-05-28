'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Paperclip, Wallet, Trash2, Receipt, Edit2, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { useStore } from '@/store/useStore';
import { Expense, ExpenseCategory } from '@/types/pos';
import { formatIDR } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasPermission } from '@/lib/acl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Tagihan Listrik',
  'Pembelian Supplier PO',
  'Gaji Karyawan',
  'Sewa Tempat',
  'Perawatan Peralatan',
  'Transportasi',
  'Lain-lain',
];

const CATEGORY_BADGE: Record<string, string> = {
  'Tagihan Listrik': 'badge-warning',
  'Pembelian Supplier PO': 'badge-indigo',
  'Gaji Karyawan': 'badge-success',
  'Sewa Tempat': 'badge-danger',
  'Perawatan Peralatan': 'badge-warning',
  'Transportasi': 'badge-indigo',
  'Lain-lain': '',
};

const CATEGORY_ICON: Record<string, string> = {
  'Tagihan Listrik': '⚡',
  'Pembelian Supplier PO': '📦',
  'Gaji Karyawan': '👥',
  'Sewa Tempat': '🏪',
  'Perawatan Peralatan': '🔧',
  'Transportasi': '🚗',
  'Lain-lain': '📋',
};

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, updateExpense, activeOutlet, currentUser } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Tagihan Listrik' as ExpenseCategory,
    description: '',
    amount: '',
    hasReceipt: false,
  });

  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  // Restrict access: Check manage_expenses permission
  if (!hasPermission(currentUser, 'manage_expenses')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 bg-card border border-border/60 rounded-2xl shadow-xl max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6 text-destructive">
          <Wallet className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Akses Terbatas</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Mohon maaf, halaman Pengeluaran Biaya hanya dapat diakses oleh pengguna dengan izin <strong>manage_expenses</strong>.
        </p>
      </div>
    );
  }

  const filteredExpenses = expenses.filter((e) =>
    categoryFilter === 'Semua' || e.category === categoryFilter
  );

  const totalThisMonth = expenses.reduce((s, e) => {
    const now = new Date();
    const expDate = new Date(e.date);
    if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
      return s + e.amount;
    }
    return s;
  }, 0);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      category: 'Tagihan Listrik',
      description: '',
      amount: '',
      hasReceipt: false,
    });
    setReceiptUrl('');
    setReceiptName('');
    setModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setForm({
      date: new Date(exp.date).toISOString().slice(0, 10),
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      hasReceipt: exp.hasReceipt,
    });
    setReceiptUrl(exp.receiptUrl || '');
    setReceiptName(exp.receiptUrl ? (exp.receiptUrl.startsWith('data:') ? 'bukti_lokal.png' : exp.receiptUrl.split('/').pop() || 'bukti_pembayaran') : '');
    setModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB!');
      return;
    }

    setReceiptName(file.name);
    setUploading(true);

    try {
      // 1. Generate base64 for local fallback & offline use
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setReceiptUrl(base64data);
        setForm(prev => ({ ...prev, hasReceipt: true }));
      };
      reader.readAsDataURL(file);

      // 2. Upload to Supabase Storage if configured
      if (isSupabaseConfigured) {
        const fileExt = file.name.split('.').pop();
        const fileName = `receipt-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('receipts')
          .upload(filePath, file);

        if (error) {
          console.warn('Storage upload error:', error.message);
          toast.warning('Bukti struk disimpan lokal (offline fallback) karena konfigurasi izin RLS Supabase Storage belum selesai.');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);
          
          setReceiptUrl(publicUrl);
          toast.success('Bukti fisik berhasil diunggah ke cloud!');
        }
      } else {
        toast.info('Bukti fisik disimpan secara lokal (offline mode)');
      }
    } catch (err) {
      console.error('Upload handler error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.description || !form.amount) {
      toast.error('Lengkapi deskripsi dan jumlah pengeluaran');
      return;
    }
    const cleanAmount = parseInt(form.amount.replace(/\D/g, ''), 10) || 0;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        date: new Date(form.date),
        category: form.category,
        description: form.description,
        amount: cleanAmount,
        hasReceipt: form.hasReceipt,
        receiptUrl: receiptUrl || undefined,
      });
      toast.success('Pengeluaran berhasil diperbarui');
    } else {
      const newExpense: Expense = {
        id: `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        date: new Date(form.date),
        category: form.category,
        description: form.description,
        amount: cleanAmount,
        outletId: activeOutlet.id,
        hasReceipt: form.hasReceipt,
        createdBy: currentUser?.name || 'Andi',
        receiptUrl: receiptUrl || undefined,
      };
      addExpense(newExpense);
      toast.success('Pengeluaran berhasil dicatat');
    }
    setModalOpen(false);
    setEditingExpense(null);
    setForm({ date: new Date().toISOString().slice(0, 10), category: 'Tagihan Listrik', description: '', amount: '', hasReceipt: false });
    setReceiptUrl('');
    setReceiptName('');
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengeluaran</h1>
          <p className="text-sm text-muted-foreground mt-1">Pencatatan biaya operasional {activeOutlet.name}</p>
        </div>
        <Button
          id="btn-add-expense"
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary/90 text-white shadow-lg glow-primary gap-2 shrink-0"
        >
          <Plus size={16} /> Catat Pengeluaran Baru
        </Button>
      </div>

      {/* ── Total Card ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 metric-card flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center shrink-0">
            <Wallet className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Pengeluaran Bulan Ini</p>
            <p className="text-3xl font-extrabold text-destructive">{formatIDR(totalThisMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.filter((e) => {
                const now = new Date();
                const d = new Date(e.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length} catatan pengeluaran
            </p>
          </div>
        </div>
        <div className="metric-card flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-warning/15 border border-warning/25 flex items-center justify-center shrink-0">
            <Receipt className="w-7 h-7 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Keseluruhan</p>
            <p className="text-2xl font-extrabold text-foreground">
              {formatIDR(expenses.reduce((s, e) => s + e.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} total catatan</p>
          </div>
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="flex gap-2 flex-wrap">
        {['Semua', ...EXPENSE_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
              categoryFilter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
            )}
          >
            {CATEGORY_ICON[cat] && <span className="mr-1">{CATEGORY_ICON[cat]}</span>}
            {cat}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">ID</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Tanggal</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Kategori</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Deskripsi</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Jumlah Biaya</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Bukti</TableHead>
              <TableHead className="text-right text-muted-foreground font-semibold">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Belum ada catatan pengeluaran</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id} className="border-border/30 hover:bg-secondary/20">
                  <TableCell className="font-mono text-xs text-primary font-bold">{expense.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(expense.date, 'dd MMM yyyy', { locale: id })}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('border-0 text-xs', CATEGORY_BADGE[expense.category] || 'bg-secondary text-secondary-foreground')}>
                      {CATEGORY_ICON[expense.category]} {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-xs truncate">
                    {expense.description}
                  </TableCell>
                  <TableCell className="text-sm font-bold text-destructive">
                    {formatIDR(expense.amount)}
                  </TableCell>
                  <TableCell>
                    {expense.receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(expense.receiptUrl || null);
                          setPreviewName(`bukti-${expense.id}`);
                        }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer"
                        title="Klik untuk pratinjau bukti fisik"
                      >
                        <Paperclip size={12} /> Lihat Bukti ↗
                      </button>
                    ) : expense.hasReceipt ? (
                      <div
                        className="flex items-center gap-1 text-xs text-success"
                        title="Bukti fisik tersedia"
                      >
                        <Paperclip size={12} /> Tersedia
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5 ml-auto">
                      <button
                        id={`btn-edit-expense-${expense.id}`}
                        onClick={() => handleOpenEdit(expense)}
                        className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        title="Ubah Pengeluaran"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        id={`btn-delete-expense-${expense.id}`}
                        onClick={() => {
                          deleteExpense(expense.id);
                          toast.success('Pengeluaran dihapus');
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/15 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add Expense Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingExpense ? 'Ubah Catatan Pengeluaran' : 'Catat Pengeluaran Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exp-date" className="text-sm font-medium">Tanggal</Label>
              <Input
                id="exp-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-background border-border/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-category" className="text-sm font-medium">Kategori Pengeluaran</Label>
              <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v as ExpenseCategory })}>
                <SelectTrigger id="exp-category" className="bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_ICON[c]} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-desc" className="text-sm font-medium">Deskripsi</Label>
              <Textarea
                id="exp-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi detail pengeluaran..."
                className="bg-background border-border/60 resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exp-amount" className="text-sm font-medium">Jumlah Biaya (IDR)</Label>
              <Input
                id="exp-amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Contoh: 500000"
                type="number"
                className="bg-background border-border/60"
              />
            </div>

            <div className="space-y-2 border-t border-border/30 pt-3">
              <Label className="text-xs font-semibold">Dokumen Bukti / Struk Fisik</Label>
              {receiptUrl ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-secondary/15">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                      {receiptUrl.includes('application/pdf') || receiptUrl.endsWith('.pdf') ? (
                        <span className="font-bold text-[10px]">PDF</span>
                      ) : (
                        <img 
                          src={receiptUrl} 
                          className="w-full h-full object-cover rounded" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }} 
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate max-w-[200px]">
                        {receiptName || 'bukti_pembayaran.jpg'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(receiptUrl);
                          setPreviewName(receiptName || 'bukti_pembayaran');
                        }}
                        className="text-[10px] text-primary hover:underline font-semibold block mt-0.5 cursor-pointer text-left"
                      >
                        Buka Dokumen ↗
                      </button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => {
                      setReceiptUrl('');
                      setReceiptName('');
                      setForm(prev => ({ ...prev, hasReceipt: false }));
                    }}
                    className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ) : (
                <div className="border border-dashed border-border/60 rounded-lg p-4 text-center bg-secondary/5 hover:bg-secondary/10 transition-all duration-200 relative">
                  <input
                    type="file"
                    id="receipt-file-upload"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <Paperclip className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">
                    {uploading ? 'Mengunggah...' : 'Pilih Foto / PDF Bukti Struk'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, JPEG, atau PDF (Maks. 5MB)</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                id="btn-save-expense"
                onClick={handleSave}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                Simpan Pengeluaran
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)} className="border-border/60">
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Preview Modal ── */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl bg-card border-border/60 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>Bukti Fisik Pengeluaran</span>
              {previewUrl && (
                <a
                  href={previewUrl}
                  download={previewName || 'bukti_pengeluaran'}
                  className="text-xs bg-primary hover:bg-primary/90 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Download size={12} /> Unduh Berkas
                </a>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dokumen lampiran struk/nota pembayaran resmi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-secondary/5 rounded-xl border border-border/40 mt-3 min-h-[300px]">
            {previewUrl ? (
              previewUrl.startsWith('data:application/pdf') || previewUrl.endsWith('.pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[50vh] rounded-lg border-0"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Bukti Struk"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md"
                />
              )
            ) : (
              <span className="text-xs text-muted-foreground">Memuat berkas...</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
