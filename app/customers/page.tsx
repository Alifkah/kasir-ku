'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  TrendingUp,
  Award,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Customer, MemberTier } from '@/types/pos';
import { exportCustomersToExcel, exportCustomersToCSV } from '@/lib/exportUtils';
import { formatIDR } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TIER_BADGES: Record<MemberTier, string> = {
  Regular: 'badge-tier-regular',
  Bronze: 'badge-tier-bronze',
  Silver: 'badge-tier-silver',
  Gold: 'badge-tier-gold',
};

const TIER_DISCOUNTS: Record<MemberTier, string> = {
  Regular: 'Diskon 0%',
  Bronze: 'Diskon 2%',
  Silver: 'Diskon 5%',
  Gold: 'Diskon 10%',
};

const TIER_RANK: Record<MemberTier, number> = {
  Gold: 4,
  Silver: 3,
  Bronze: 2,
  Regular: 1,
};

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<MemberTier | 'All'>('All');

  // Sheet form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tier: 'Regular' as MemberTier,
    points: 0,
    totalSpent: 0,
  });

  type SortField = 'name' | 'tier' | 'points' | 'totalSpent' | 'joinedDate';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="ml-1.5 opacity-40 hover:opacity-80" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="ml-1.5 text-primary" />
    ) : (
      <ArrowDown size={12} className="ml-1.5 text-primary" />
    );
  };

  // Filtered & Sorted customers
  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTier = selectedTier === 'All' || c.tier === selectedTier;

      return matchesSearch && matchesTier;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'tier') {
        const rankA = TIER_RANK[a.tier] || 0;
        const rankB = TIER_RANK[b.tier] || 0;
        comparison = rankA - rankB;
      } else if (sortField === 'points') {
        comparison = a.points - b.points;
      } else if (sortField === 'totalSpent') {
        comparison = a.totalSpent - b.totalSpent;
      } else if (sortField === 'joinedDate') {
        comparison = new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customers, searchTerm, selectedTier, sortField, sortDirection]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      tier: 'Regular',
      points: 0,
      totalSpent: 0,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      tier: customer.tier,
      points: customer.points,
      totalSpent: customer.totalSpent,
    });
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Nama dan Nomor Telepon wajib diisi');
      return;
    }

    if (editingCustomer) {
      // Edit mode
      updateCustomer(editingCustomer.id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        tier: formData.tier,
        points: Number(formData.points),
        totalSpent: Number(formData.totalSpent),
      });
      toast.success('Profil pelanggan berhasil diperbarui');
    } else {
      // Add mode
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        points: Number(formData.points) || 0,
        joinedDate: new Date(),
        tier: formData.tier,
        totalSpent: Number(formData.totalSpent) || 0,
      };
      addCustomer(newCustomer);
      toast.success('Pelanggan baru berhasil ditambahkan');
    }

    setIsOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus member "${name}"?`)) {
      deleteCustomer(id);
      toast.success(`Member "${name}" telah dihapus`);
    }
  };

  const handleExportExcel = () => {
    exportCustomersToExcel(filteredCustomers);
    toast.success('Daftar member berhasil diekspor ke Excel!');
  };

  const handleExportCSV = () => {
    exportCustomersToCSV(filteredCustomers);
    toast.success('Daftar member berhasil diekspor ke CSV!');
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Pelanggan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola keanggotaan member loyalitas toko, kumpulkan poin belanja, dan berikan diskon otomatis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="border-border/60 hover:bg-secondary/20 gap-1.5 cursor-pointer text-xs font-semibold h-9"
          >
            <Download size={14} />
            Ekspor Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-border/60 hover:bg-secondary/20 gap-1.5 cursor-pointer text-xs font-semibold h-9"
          >
            <Download size={14} />
            Ekspor CSV
          </Button>
          <Button
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary/90 text-white gap-1.5 cursor-pointer text-xs font-semibold h-9 shadow-lg glow-primary"
          >
            <Plus size={14} />
            Daftar Member Baru
          </Button>
        </div>
      </div>

      {/* ── Info Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Terdaftar</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{customers.length} Member</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Member Gold & Silver</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              {customers.filter((c) => c.tier === 'Gold' || c.tier === 'Silver').length} Member
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-success">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Nilai Poin Beredar</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              {customers.reduce((sum, c) => sum + c.points, 0)} Poin
            </p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Row ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, atau nomor telepon member..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border/60"
          />
        </div>
        <Select
          value={selectedTier}
          onValueChange={(val) => setSelectedTier(val as MemberTier | 'All')}
        >
          <SelectTrigger className="w-full sm:w-48 bg-card border-border/60">
            <SelectValue placeholder="Semua Tier" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="All">Semua Tier</SelectItem>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Bronze">Bronze (Diskon 2%)</SelectItem>
            <SelectItem value="Silver">Silver (Diskon 5%)</SelectItem>
            <SelectItem value="Gold">Gold (Diskon 10%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Customers Table ── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead
                className="text-muted-foreground font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Nama Member
                  {renderSortIcon('name')}
                </div>
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">Kontak</TableHead>
              <TableHead
                className="text-muted-foreground font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('tier')}
              >
                <div className="flex items-center">
                  Tier Keanggotaan
                  {renderSortIcon('tier')}
                </div>
              </TableHead>
              <TableHead
                className="text-muted-foreground font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('points')}
              >
                <div className="flex items-center">
                  Poin Loyalitas
                  {renderSortIcon('points')}
                </div>
              </TableHead>
              <TableHead
                className="text-muted-foreground font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('totalSpent')}
              >
                <div className="flex items-center">
                  Total Belanja
                  {renderSortIcon('totalSpent')}
                </div>
              </TableHead>
              <TableHead
                className="text-muted-foreground font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('joinedDate')}
              >
                <div className="flex items-center">
                  Bergabung Pada
                  {renderSortIcon('joinedDate')}
                </div>
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="border-border/30 hover:bg-secondary/20">
                  {/* Name */}
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {customer.name[0].toUpperCase()}
                      </div>
                      <span>{customer.name}</span>
                    </div>
                  </TableCell>
                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {/* Tier */}
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge className={cn('border border-border/40 text-[10px] font-bold py-0.5 px-2', TIER_BADGES[customer.tier])}>
                        {customer.tier}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{TIER_DISCOUNTS[customer.tier]}</span>
                    </div>
                  </TableCell>
                  {/* Points */}
                  <TableCell className="font-bold text-foreground">
                    <span className="text-primary">{customer.points}</span> Poin
                  </TableCell>
                  {/* Total Spent */}
                  <TableCell className="font-semibold text-emerald-500">
                    {formatIDR(customer.totalSpent)}
                  </TableCell>
                  {/* Joined Date */}
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(customer.joinedDate).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  {/* Actions */}
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(customer)}
                        className="w-8 h-8 hover:bg-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(customer.id, customer.name)}
                        className="w-8 h-8 hover:bg-destructive/15 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Tidak ada data pelanggan yang cocok dengan pencarian Anda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Dialog Sheet Form ── */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="bg-popover border-border/60 w-full sm:max-w-md p-0 flex flex-col h-full overflow-hidden">
          <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="p-6 pb-4 border-b border-border/20 shrink-0">
              <SheetTitle className="text-lg font-bold">
                {editingCustomer ? 'Edit Profil Member' : 'Daftar Member Baru'}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {editingCustomer
                  ? 'Ubah data detail keanggotaan pelanggan yang sudah terdaftar.'
                  : 'Pendaftaran member baru untuk mengaktifkan loyalitas poin belanja.'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="cust-name" className="text-xs text-muted-foreground font-semibold">Nama Pelanggan *</Label>
                <Input
                  id="cust-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="cth. Andi Budiman"
                  className="bg-background border-border/60 text-sm h-10"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone" className="text-xs text-muted-foreground font-semibold">Nomor Telepon (WhatsApp) *</Label>
                <Input
                  id="cust-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="cth. 08123456789"
                  className="bg-background border-border/60 text-sm h-10"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="cust-email" className="text-xs text-muted-foreground font-semibold">Email (Opsional)</Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cth. andi@gmail.com"
                  className="bg-background border-border/60 text-sm h-10"
                />
              </div>

              {/* Tier */}
              <div className="space-y-1.5">
                <Label htmlFor="cust-tier" className="text-xs text-muted-foreground font-semibold">Tier Member</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(val) => setFormData({ ...formData, tier: val as MemberTier })}
                >
                  <SelectTrigger id="cust-tier" className="w-full bg-background border-border/60 h-10 text-sm">
                    <SelectValue placeholder="Pilih Tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Regular">Regular (Diskon 0%)</SelectItem>
                    <SelectItem value="Bronze">Bronze (Diskon 2%)</SelectItem>
                    <SelectItem value="Silver">Silver (Diskon 5%)</SelectItem>
                    <SelectItem value="Gold">Gold (Diskon 10%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Points & Total Spent */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-points" className="text-xs text-muted-foreground font-semibold">Poin Awal</Label>
                  <Input
                    id="cust-points"
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    className="bg-background border-border/60 text-sm h-10"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-spent" className="text-xs text-muted-foreground font-semibold">Total Belanja Awal (Rp)</Label>
                  <Input
                    id="cust-spent"
                    type="number"
                    value={formData.totalSpent}
                    onChange={(e) => setFormData({ ...formData, totalSpent: Number(e.target.value) })}
                    className="bg-background border-border/60 text-sm h-10"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-border/20 bg-muted/20 shrink-0 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-border/60 h-10 text-sm cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-white h-10 text-sm font-semibold cursor-pointer"
              >
                {editingCustomer ? 'Simpan Perubahan' : 'Daftar Member'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
