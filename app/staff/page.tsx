'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Store,
  UserCheck,
  ShieldAlert,
  Check,
  Search,
  History,
  Printer,
} from 'lucide-react';
import { printShiftReport } from '@/lib/exportUtils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { User, PermissionKey, UserRole } from '@/types/pos';
import { hasPermission } from '@/lib/acl';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatIDR } from '@/data/mockData';

// Define the permissions mapping for presentation
const ALL_PERMISSIONS: { key: PermissionKey; label: string; group: string; description: string }[] = [
  {
    key: 'view_reports',
    label: 'Lihat Analitik & Laba Rugi',
    group: 'Keuangan',
    description: 'Akses penuh ke modul Analitik, Laporan Laba Rugi (P&L), dan grafik keuangan.',
  },
  {
    key: 'manage_expenses',
    label: 'Pencatatan Beban Biaya',
    group: 'Keuangan',
    description: 'Menambah, mengedit, dan menghapus pencatatan pengeluaran operasional toko.',
  },
  {
    key: 'manage_inventory',
    label: 'Kelola Produk & Edit Stok',
    group: 'Operasional',
    description: 'Menambah produk baru, mengubah info harga, dan mengubah kuantitas stok barang.',
  },
  {
    key: 'process_refunds',
    label: 'Proses Retur & Refund',
    group: 'Operasional',
    description: 'Melakukan persetujuan retur parsial/total produk dan mengembalikan dana transaksi.',
  },
  {
    key: 'manage_promos',
    label: 'Manajemen Kupon & Promo',
    group: 'Operasional',
    description: 'Mengatur kode voucher belanja, diskon member, dan potongan harga musiman.',
  },
  {
    key: 'manage_suppliers_po',
    label: 'Manajemen Supplier & PO',
    group: 'Operasional',
    description: 'Mengelola daftar vendor supplier, menerbitkan PO, dan mengonfirmasi terima barang.',
  },
  {
    key: 'manage_settings',
    label: 'Pengaturan Pajak & Bisnis',
    group: 'Administrasi',
    description: 'Mengubah konfigurasi pajak PPN, profil outlet/toko, dan pengaturan struk.',
  },
  {
    key: 'manage_staff',
    label: 'Kelola Staf & Hak Akses (ACL)',
    group: 'Administrasi',
    description: 'Hak tertinggi untuk mengelola keanggotaan staf dan mengatur izin modul sistem.',
  },
];

export default function StaffPage() {
  const { users, addUser, updateUser, deleteUser, shiftsHistory, currentUser, outlets, transactions } = useStore();

  const [activeTab, setActiveTab] = useState<'staff' | 'shifts'>('staff');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Semua');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Cashier' as UserRole,
    outletId: '',
    isActive: true,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  // 1. Page-level dynamic ACL check
  if (!hasPermission(currentUser, 'manage_staff')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 bg-card border border-border/60 rounded-2xl shadow-xl max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6 text-destructive">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Akses Terbatas</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Mohon maaf, halaman manajemen staf & hak akses (ACL) hanya dapat diakses oleh pengguna dengan izin <strong>manage_staff</strong>.
        </p>
      </div>
    );
  }

  // 2. Compute KPI counts
  const totalStaffCount = users.length;
  const activeStaffCount = users.filter((u) => u.isActive !== false).length;
  const cashierCount = users.filter((u) => u.role === 'Cashier').length;

  // 3. Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'Semua' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const openAddModal = () => {
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'Cashier',
      outletId: outlets[0]?.id || 'outlet-001',
      isActive: true,
    });
    setSelectedPermissions([]);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: user.password || '',
      role: user.role,
      outletId: user.outletId || outlets[0]?.id || 'outlet-001',
      isActive: user.isActive !== false,
    });
    setSelectedPermissions(user.permissions || []);
    setModalOpen(true);
  };

  const handleTogglePermission = (key: PermissionKey) => {
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.email || (!editingUser && !form.password)) {
      toast.error('Lengkapi semua field wajib!');
      return;
    }

    const emailTaken = users.some(
      (u) => u.email.toLowerCase() === form.email.toLowerCase() && (!editingUser || u.id !== editingUser.id)
    );
    if (emailTaken) {
      toast.error('Email ini sudah terdaftar!');
      return;
    }

    // Owner role automatically gets all permissions, Cashier gets selected ones
    const finalPermissions = form.role === 'Owner'
      ? ALL_PERMISSIONS.map(p => p.key)
      : selectedPermissions;

    try {
      if (editingUser) {
        // Prevent Owner from locking themselves out of manage_staff
        if (editingUser.id === currentUser?.id && !finalPermissions.includes('manage_staff')) {
          toast.error('Anda tidak dapat menghapus izin Kelola Staf dari akun Anda sendiri!');
          return;
        }

        await updateUser(editingUser.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          outletId: form.role === 'Owner' ? undefined : form.outletId,
          isActive: form.isActive,
          permissions: finalPermissions,
        });
        toast.success(`Staf "${form.name}" berhasil diperbarui`);
      } else {
        await addUser({
          id: `user-${Date.now()}`,
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          outletId: form.role === 'Owner' ? undefined : form.outletId,
          isActive: form.isActive,
          permissions: finalPermissions,
        });
        toast.success(`Staf baru "${form.name}" berhasil didaftarkan`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan data staf');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!');
      return;
    }
    try {
      await deleteUser(user.id);
      toast.success(`Akun staf "${user.name}" berhasil dihapus`);
    } catch (err) {
      toast.error('Gagal menghapus akun staf');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Anda tidak dapat menonaktifkan akun Anda sendiri!');
      return;
    }
    const nextActive = user.isActive === false ? true : false;
    try {
      await updateUser(user.id, { isActive: nextActive });
      toast.success(`Status akun "${user.name}" diubah menjadi ${nextActive ? 'Aktif' : 'Non-aktif'}`);
    } catch (err) {
      toast.error('Gagal mengubah status aktif staf');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staf & Hak Akses (ACL)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola keanggotaan staf dan atur izin akses modul secara dinamis
          </p>
        </div>
        <Button
          id="btn-add-staff"
          onClick={openAddModal}
          className="bg-primary hover:bg-primary/90 text-white shadow-lg glow-primary gap-2 shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Tambah Staf Baru
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-muted-foreground font-semibold">TOTAL STAF TERDAFTAR</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-foreground">{totalStaffCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Akun operator sistem</p>
        </div>

        <div className="metric-card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-muted-foreground font-semibold">STAF AKTIF (ONLINE)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-emerald-500">{activeStaffCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Bisa login ke sistem POS</p>
        </div>

        <div className="metric-card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-muted-foreground font-semibold">STAF KASIR</span>
            <Store className="w-4 h-4 text-warning" />
          </div>
          <p className="text-3xl font-black text-foreground">{cashierCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Memproses penjualan POS</p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-border/40 gap-4 print:hidden mb-4">
        <button
          onClick={() => setActiveTab('staff')}
          className={cn(
            'pb-3 text-sm font-semibold transition-all relative cursor-pointer',
            activeTab === 'staff'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Daftar Staf
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={cn(
            'pb-3 text-sm font-semibold transition-all relative cursor-pointer',
            activeTab === 'shifts'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Riwayat Shift Kasir
        </button>
      </div>

      {activeTab === 'staff' ? (
        <>
          {/* ── Filters ── */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="staff-search"
                placeholder="Cari nama staf atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-border/60"
              />
            </div>

            <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v)}>
              <SelectTrigger id="role-filter" className="w-44 bg-card border-border/60">
                <SelectValue placeholder="Peran (Role)" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="Semua">Semua Peran</SelectItem>
                <SelectItem value="Owner">Owner / Pemilik</SelectItem>
                <SelectItem value="Cashier">Cashier / Kasir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Table ── */}
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Staf</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Peran</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Outlet</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Telepon</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Izin Modul</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Status Aktif</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>Tidak ada staf ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const permissionsCount = user.role === 'Owner'
                      ? ALL_PERMISSIONS.length
                      : (user.permissions || []).length;

                    return (
                      <TableRow key={user.id} className="border-border/30 hover:bg-secondary/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-border/60">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                user.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                                {user.name} {isSelf && <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded">(Saya)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            'border-0 text-xs font-semibold px-2 py-0.5',
                            user.role === 'Owner' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          )}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.role === 'Owner' ? 'Semua Outlet' : outlets.find(o => o.id === user.outletId)?.name || 'Outlet Utama'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {user.phone || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-xs font-bold text-foreground">
                              {user.role === 'Owner' ? 'Akses Penuh' : `${permissionsCount} dari ${ALL_PERMISSIONS.length} modul`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf}
                            className={cn(
                              'text-xs px-2.5 py-1 rounded-full font-semibold border transition-all',
                              isSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                              user.isActive !== false
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                            )}
                            title={isSelf ? 'Anda tidak bisa menonaktifkan diri sendiri' : 'Klik untuk ubah status keaktifan'}
                          >
                            {user.isActive !== false ? '✓ Aktif' : '✕ Dinonaktifkan'}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Edit staf & hak akses"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isSelf}
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                                isSelf
                                  ? 'bg-secondary/20 text-muted-foreground/30 cursor-not-allowed'
                                  : 'bg-secondary/60 hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer'
                              )}
                              title={isSelf ? 'Anda tidak bisa menghapus diri sendiri' : 'Hapus akun staf'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          {/* ── Shift History Table ── */}
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent text-xs">
                  <TableHead className="text-muted-foreground font-semibold">ID Shift</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Kasir</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Waktu Mulai</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Waktu Selesai</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right pr-4">Modal Awal</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right pr-4">Uang Fisik Laci</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right pr-4">Selisih</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Catatan</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftsHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <History className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
                      <p className="text-sm font-semibold">Belum ada riwayat sesi shift kasir</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  shiftsHistory.map((shift) => {
                    const isDiffNegative = (shift.difference || 0) < 0;
                    const isDiffPositive = (shift.difference || 0) > 0;
                    return (
                      <TableRow key={shift.id} className="border-border/30 hover:bg-secondary/20 text-xs">
                        <TableCell className="font-mono text-xs text-primary font-bold">{shift.id}</TableCell>
                        <TableCell className="text-sm font-semibold text-foreground">{shift.cashierName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(shift.startTime), 'dd MMM yyyy HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {shift.endTime 
                            ? format(new Date(shift.endTime), 'dd MMM yyyy HH:mm', { locale: id })
                            : '—'
                          }
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold text-foreground pr-4">
                          {formatIDR(shift.initialCash)}
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold text-foreground pr-4">
                          {shift.actualCash !== undefined ? formatIDR(shift.actualCash) : '—'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-sm text-right font-bold pr-4",
                          isDiffNegative && "text-destructive",
                          isDiffPositive && "text-emerald-500",
                          !isDiffNegative && !isDiffPositive && "text-muted-foreground"
                        )}>
                          {shift.difference !== undefined 
                            ? `${shift.difference > 0 ? '+' : ''}${formatIDR(shift.difference)}`
                            : '—'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "border-0 text-[10px] font-bold px-2 py-0.5",
                            shift.isActive 
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                              : "bg-secondary text-secondary-foreground"
                          )}>
                            {shift.isActive ? 'Aktif (Berjalan)' : 'Tutup Shift'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate" title={shift.notes}>
                          {shift.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <button
                            onClick={() => printShiftReport(shift, transactions)}
                            className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-auto cursor-pointer"
                            title="Cetak Rekap / Z-Report"
                          >
                            <Printer size={14} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── Add/Edit Staff Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border/60 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingUser ? 'Ubah Hak Akses & Info Staf' : 'Daftarkan Staf Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Konfigurasi detail identitas akun staf beserta otorisasi izin modul dinamis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Identity section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="staff-name" className="text-xs font-semibold">Nama Lengkap *</Label>
                <Input
                  id="staff-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Budi Cahyono"
                  className="bg-background border-border/60 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-email" className="text-xs font-semibold">Email Kantor *</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="budi@kasirku.id"
                  className="bg-background border-border/60 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="staff-phone" className="text-xs font-semibold">No. Telepon / WhatsApp</Label>
                <Input
                  id="staff-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0812345678"
                  className="bg-background border-border/60 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-password" className="text-xs font-semibold">
                  {editingUser ? 'Ubah Kata Sandi (Opsional)' : 'Kata Sandi Awal *'}
                </Label>
                <Input
                  id="staff-password"
                  type="text" // Shown as plain text in prototype for easier review
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Masukkan kata sandi..."
                  className="bg-background border-border/60 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="staff-role" className="text-xs font-semibold">Peran Sistem (Role) *</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => val && setForm({ ...form, role: val as UserRole })}
                  disabled={editingUser?.id === currentUser?.id}
                >
                  <SelectTrigger id="staff-role" className="bg-background border-border/60 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Owner">Owner (Akses Penuh)</SelectItem>
                    <SelectItem value="Cashier">Cashier (Kasir)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.role === 'Cashier' && (
                <div className="space-y-1.5">
                  <Label htmlFor="staff-outlet" className="text-xs font-semibold">Outlet Penugasan *</Label>
                  <Select
                    value={form.outletId}
                    onValueChange={(val) => val && setForm({ ...form, outletId: val })}
                  >
                    <SelectTrigger id="staff-outlet" className="bg-background border-border/60 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {outlets.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Dynamic Permissions section (Only for Cashier, Owner has full access) */}
            {form.role === 'Cashier' ? (
              <div className="space-y-3 pt-2 border-t border-border/30">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Kontrol Izin Modul (Dynamic ACL)</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Centang modul-modul tambahan yang diizinkan untuk diakses kasir ini.</p>
                </div>

                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                  {/* Group permissions by Category */}
                  {['Keuangan', 'Operasional', 'Administrasi'].map((groupName) => {
                    const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === groupName);

                    return (
                      <div key={groupName} className="space-y-2">
                        <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider">{groupName}</h5>
                        <div className="grid grid-cols-1 gap-2">
                          {groupPerms.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            return (
                              <button
                                key={perm.key}
                                type="button"
                                onClick={() => handleTogglePermission(perm.key)}
                                className={cn(
                                  'flex items-start text-left gap-3 p-2.5 rounded-lg border text-xs transition-all cursor-pointer hover:bg-secondary/15',
                                  isChecked ? 'border-primary bg-primary/5' : 'border-border/60 bg-background/40'
                                )}
                              >
                                <div className={cn(
                                  'w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5',
                                  isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border/80 bg-background'
                                )}>
                                  {isChecked && <Check className="w-3 h-3" strokeWidth={3} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-foreground leading-tight block">{perm.label}</span>
                                  <span className="text-[9px] text-muted-foreground mt-0.5 block leading-normal">{perm.description}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-medium">
                🛡️ Staf dengan peran **Owner** secara otomatis diberikan akses penuh terhadap seluruh modul sistem operasional & administrasi.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/30">
            <Button
              id="btn-save-staff"
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-white font-bold"
            >
              Simpan Staf
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
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
