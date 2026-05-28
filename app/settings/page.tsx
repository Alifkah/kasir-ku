'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Percent,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Check,
  ChevronRight,
  Tag,
  Calendar,
  Trash2,
  Plus,
  Settings,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store/useStore';
import { mockBusinessProfile, formatIDR } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Promo, PromoType, Outlet } from '@/types/pos';
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
import { hasPermission } from '@/lib/acl';

export default function SettingsPage() {
  const {
    outlets,
    toggleOutletStatus,
    taxSettings,
    updateTaxSettings,
    promos,
    addPromo,
    updatePromo,
    deletePromo,
    currentUser,
    businessProfile,
    updateBusinessProfile,
    addOutlet,
    updateOutlet,
  } = useStore();

  const [profile, setProfile] = useState(businessProfile);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    if (businessProfile) {
      setProfile(businessProfile);
    }
  }, [businessProfile]);

  // Dialog States for Add/Edit Outlet
  const [isOutletDialogOpen, setIsOutletDialogOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [outletForm, setOutletForm] = useState({
    name: '',
    manager: '',
    phone: '',
    address: '',
  });

  const handleOpenAddOutlet = () => {
    setSelectedOutlet(null);
    setOutletForm({
      name: '',
      manager: '',
      phone: '',
      address: '',
    });
    setIsOutletDialogOpen(true);
  };

  const handleOpenEditOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setOutletForm({
      name: outlet.name,
      manager: outlet.manager,
      phone: outlet.phone,
      address: outlet.address,
    });
    setIsOutletDialogOpen(true);
  };

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletForm.name.trim()) {
      toast.error('Nama outlet wajib diisi');
      return;
    }

    try {
      if (selectedOutlet) {
        // Edit mode
        await updateOutlet(selectedOutlet.id, {
          name: outletForm.name.trim(),
          manager: outletForm.manager.trim(),
          phone: outletForm.phone.trim(),
          address: outletForm.address.trim(),
        });
        toast.success(`Outlet "${outletForm.name}" berhasil diperbarui`);
      } else {
        // Add mode
        const newOutlet: Outlet = {
          id: `outlet-${Date.now()}`,
          name: outletForm.name.trim(),
          manager: outletForm.manager.trim(),
          phone: outletForm.phone.trim(),
          address: outletForm.address.trim(),
          staffCount: 0,
          isActive: true,
        };
        await addOutlet(newOutlet);
        toast.success(`Outlet "${outletForm.name}" berhasil ditambahkan`);
      }
      setIsOutletDialogOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan outlet');
      console.error(err);
    }
  };

  // New Promo form states
  const [promoForm, setPromoForm] = useState({
    code: '',
    name: '',
    type: 'Percentage' as PromoType,
    value: 0,
    minPurchase: 0,
    startDate: '',
    endDate: '',
  });

  const handleSaveProfile = async () => {
    await updateBusinessProfile(profile);
    setEditingProfile(false);
    toast.success('Profil bisnis berhasil disimpan');
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.name || !promoForm.startDate || !promoForm.endDate) {
      toast.error('Silakan isi seluruh field wajib');
      return;
    }

    const newPromo: Promo = {
      id: `promo-${Date.now()}`,
      code: promoForm.code.toUpperCase().replace(/\s+/g, ''),
      name: promoForm.name,
      type: promoForm.type,
      value: Number(promoForm.value) || 0,
      minPurchase: Number(promoForm.minPurchase) || 0,
      startDate: new Date(promoForm.startDate),
      endDate: new Date(promoForm.endDate),
      isActive: true,
    };

    addPromo(newPromo);
    toast.success(`Promo "${newPromo.code}" berhasil dijadwalkan!`);

    // Reset Form
    setPromoForm({
      code: '',
      name: '',
      type: 'Percentage',
      value: 0,
      minPurchase: 0,
      startDate: '',
      endDate: '',
    });
  };

  const handleTogglePromo = (id: string, currentStatus: boolean, code: string) => {
    updatePromo(id, { isActive: !currentStatus });
    toast.success(`Promo "${code}" berhasil ${currentStatus ? 'dinonaktifkan' : 'diaktifkan'}`);
  };

  const handleDeletePromo = (id: string, code: string) => {
    if (confirm(`Hapus promo "${code}"?`)) {
      deletePromo(id);
      toast.success(`Promo "${code}" telah dihapus`);
    }
  };

  // Restrict access: Check manage_settings permission (moved below hooks to avoid hook order violation)
  if (!hasPermission(currentUser, 'manage_settings')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 bg-card border border-border/60 rounded-2xl shadow-xl max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6 text-destructive">
          <Settings className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Akses Terbatas</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Mohon maaf, halaman Pengaturan Sistem hanya dapat diakses oleh pengguna dengan izin <strong>manage_settings</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-1 flex-wrap">
          Konfigurasi profil bisnis, outlet, sistem pajak, dan program diskon promo aktif
        </p>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-card border border-border/60 p-1 h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger
            value="profile"
            id="tab-profile"
            className="px-5 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 mr-2" /> Profil Bisnis
          </TabsTrigger>
          <TabsTrigger
            value="outlets"
            id="tab-outlets"
            className="px-5 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 mr-2" /> Manajemen Outlet
          </TabsTrigger>
          <TabsTrigger
            value="tax"
            id="tab-tax"
            className="px-5 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all cursor-pointer"
          >
            <Percent className="w-4 h-4 mr-2" /> Pajak & Biaya
          </TabsTrigger>
          <TabsTrigger
            value="promos"
            id="tab-promos"
            className="px-5 py-2.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all cursor-pointer"
          >
            <Tag className="w-4 h-4 mr-2" /> Diskon & Promo
          </TabsTrigger>
        </TabsList>

        {/* ─── PROFIL BISNIS ─── */}
        <TabsContent value="profile" className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-foreground">Informasi Bisnis</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Detail identitas usaha yang akan tampil pada struk</p>
              </div>
              <Button
                variant={editingProfile ? 'default' : 'outline'}
                size="sm"
                onClick={editingProfile ? handleSaveProfile : () => setEditingProfile(true)}
                id="btn-edit-profile"
                className={cn(editingProfile ? 'bg-success hover:bg-success/90 text-white cursor-pointer' : 'border-border/60 cursor-pointer')}
              >
                {editingProfile ? (
                  <><Check size={14} className="mr-1.5" /> Simpan Profil</>
                ) : (
                  <><Edit2 size={14} className="mr-1.5" /> Edit Profil</>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SettingsField
                label="Nama Bisnis"
                icon={<Building2 size={14} />}
                value={profile.businessName}
                editable={editingProfile}
                onChange={(v) => setProfile({ ...profile, businessName: v })}
                id="field-business-name"
              />
              <SettingsField
                label="Nama Pemilik"
                icon={<User size={14} />}
                value={profile.ownerName}
                editable={editingProfile}
                onChange={(v) => setProfile({ ...profile, ownerName: v })}
                id="field-owner-name"
              />
              <SettingsField
                label="No. Telepon"
                icon={<Phone size={14} />}
                value={profile.phone}
                editable={editingProfile}
                onChange={(v) => setProfile({ ...profile, phone: v })}
                id="field-phone"
              />
              <SettingsField
                label="Email"
                icon={<Mail size={14} />}
                value={profile.email}
                editable={editingProfile}
                onChange={(v) => setProfile({ ...profile, email: v })}
                id="field-email"
              />
              <SettingsField
                label="NPWP"
                icon={<FileText size={14} />}
                value={profile.taxId}
                editable={editingProfile}
                onChange={(v) => setProfile({ ...profile, taxId: v })}
                id="field-taxid"
              />
              <SettingsField
                label="Alamat"
                icon={<MapPin size={14} />}
                value={profile.address}
                editable={editingProfile}
                onChange={(v) => setProfile({ ...profile, address: v })}
                id="field-address"
              />
            </div>

            {/* Kustomisasi Struk */}
            <div className="border-t border-border/40 pt-6 mt-6 space-y-5">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Catatan Kustom Struk Belanja</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Atur pesan pembuka (header) dan pesan penutup (footer) kustom pada struk belanja thermal Anda</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="field-receipt-header" className="text-xs font-medium text-muted-foreground">
                    Header Catatan Struk (Pembuka)
                  </Label>
                  {editingProfile ? (
                    <textarea
                      id="field-receipt-header"
                      value={profile.receiptHeader || ''}
                      onChange={(e) => setProfile({ ...profile, receiptHeader: e.target.value })}
                      placeholder="Contoh: *** WELCOME TO KASIRKU ***\nPromo Diskon 10%"
                      className="w-full bg-background border border-border/60 rounded-lg p-2.5 text-sm h-24 focus:outline-none focus:border-primary text-foreground resize-none"
                    />
                  ) : (
                    <div className="px-3 py-2.5 rounded-lg bg-secondary/40 border border-border/30 text-sm text-foreground h-24 overflow-y-auto whitespace-pre-line">
                      {profile.receiptHeader || '*** KASIRKU POS ***'}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="field-receipt-footer" className="text-xs font-medium text-muted-foreground">
                    Footer Catatan Struk (Penutup)
                  </Label>
                  {editingProfile ? (
                    <textarea
                      id="field-receipt-footer"
                      value={profile.receiptFooter || ''}
                      onChange={(e) => setProfile({ ...profile, receiptFooter: e.target.value })}
                      placeholder="Contoh: Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar."
                      className="w-full bg-background border border-border/60 rounded-lg p-2.5 text-sm h-24 focus:outline-none focus:border-primary text-foreground resize-none"
                    />
                  ) : (
                    <div className="px-3 py-2.5 rounded-lg bg-secondary/40 border border-border/30 text-sm text-foreground h-24 overflow-y-auto whitespace-pre-line">
                      {profile.receiptFooter || 'Terima Kasih Atas Kunjungan Anda\nKasirKu POS System'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── MANAJEMEN OUTLET ─── */}
        <TabsContent value="outlets" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{outlets.length} outlet terdaftar</p>
            <Button
              size="sm"
              id="btn-add-outlet"
              className="bg-primary hover:bg-primary/90 text-white gap-1.5 cursor-pointer"
              onClick={handleOpenAddOutlet}
            >
              + Tambah Outlet
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outlets.map((outlet) => (
              <div
                key={outlet.id}
                id={`outlet-card-${outlet.id}`}
                className="rounded-xl border border-border/60 bg-card p-5 space-y-4"
              >
                {/* Outlet header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{outlet.name}</p>
                      <p className="text-xs text-muted-foreground">Manager: {outlet.manager}</p>
                    </div>
                  </div>
                  {/* Active toggle */}
                  <button
                    id={`toggle-outlet-${outlet.id}`}
                    onClick={() => {
                      toggleOutletStatus(outlet.id);
                      toast.success(`${outlet.name} ${outlet.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
                  >
                    {outlet.isActive ? (
                      <>
                        <ToggleRight className="w-8 h-8 text-success" />
                        <span className="text-success">Aktif</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                        <span className="text-muted-foreground">Nonaktif</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Outlet details */}
                <div className="space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span className="leading-snug">{outlet.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} />
                    <span>{outlet.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={12} />
                    <span>{outlet.staffCount} staf aktif</span>
                  </div>
                </div>

                {/* Status and edit */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <Badge className={cn('border-0 text-xs', outlet.isActive ? 'badge-success' : 'badge-danger')}>
                    {outlet.isActive ? '● Beroperasi' : '● Tidak Aktif'}
                  </Badge>
                  <button
                    id={`btn-edit-outlet-${outlet.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                    onClick={() => handleOpenEditOutlet(outlet)}
                  >
                    <Edit2 size={11} /> Edit
                    <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dialog Modal Tambah / Edit Outlet */}
          <Dialog open={isOutletDialogOpen} onOpenChange={setIsOutletDialogOpen}>
            <DialogContent className="max-w-md bg-card border-border/60">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedOutlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedOutlet
                    ? 'Perbarui informasi detail cabang toko Anda'
                    : 'Daftarkan cabang toko baru Anda ke sistem'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveOutlet} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="outlet-name" className="text-xs font-semibold text-muted-foreground">
                    Nama Outlet *
                  </Label>
                  <Input
                    id="outlet-name"
                    placeholder="cth. Outlet Kelapa Gading"
                    value={outletForm.name}
                    onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })}
                    className="bg-background border-border/60 text-sm h-10"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="outlet-manager" className="text-xs font-semibold text-muted-foreground">
                      Manager / PIC
                    </Label>
                    <Input
                      id="outlet-manager"
                      placeholder="cth. Budi Santoso"
                      value={outletForm.manager}
                      onChange={(e) => setOutletForm({ ...outletForm, manager: e.target.value })}
                      className="bg-background border-border/60 text-sm h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outlet-phone" className="text-xs font-semibold text-muted-foreground">
                      No. Telepon
                    </Label>
                    <Input
                      id="outlet-phone"
                      placeholder="cth. 08123456789"
                      value={outletForm.phone}
                      onChange={(e) => setOutletForm({ ...outletForm, phone: e.target.value })}
                      className="bg-background border-border/60 text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outlet-address" className="text-xs font-semibold text-muted-foreground">
                    Alamat Lengkap
                  </Label>
                  <Input
                    id="outlet-address"
                    placeholder="cth. Jl. Boulevard Raya No. 12, Jakarta Utara"
                    value={outletForm.address}
                    onChange={(e) => setOutletForm({ ...outletForm, address: e.target.value })}
                    className="bg-background border-border/60 text-sm h-10"
                  />
                </div>

                <DialogFooter className="pt-4 border-t border-border/20 -mx-6 -mb-6 p-6 flex flex-row justify-end gap-3 bg-muted/20">
                  <Button type="button" variant="outline" onClick={() => setIsOutletDialogOpen(false)} className="border-border/60 cursor-pointer">
                    Batal
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white cursor-pointer">
                    Simpan
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── PAJAK & BIAYA ─── */}
        <TabsContent value="tax" className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-card p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-foreground">Pengaturan Pajak & Biaya Transaksi</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Konfigurasi berlaku untuk semua outlet secara global</p>
            </div>

            {/* PPN */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/40">
              <div>
                <p className="font-medium text-sm text-foreground">Pajak Pertambahan Nilai (PPN)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sesuai regulasi DJP Indonesia — PPN 11%
                </p>
              </div>
              <button
                id="toggle-ppn"
                onClick={() => {
                  updateTaxSettings({ ppnEnabled: !taxSettings.ppnEnabled });
                  toast.success(`PPN ${!taxSettings.ppnEnabled ? 'diaktifkan' : 'dinonaktifkan'}`);
                }}
                className="transition-colors cursor-pointer"
              >
                {taxSettings.ppnEnabled ? (
                  <ToggleRight className="w-10 h-10 text-success" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                )}
              </button>
            </div>

            {taxSettings.ppnEnabled && (
              <div className="space-y-2">
                <Label htmlFor="ppn-rate" className="text-sm font-medium">Tarif PPN (%)</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="ppn-rate"
                    type="number"
                    value={(taxSettings.ppnRate * 100).toFixed(0)}
                    onChange={(e) => updateTaxSettings({ ppnRate: (parseFloat(e.target.value) || 0) / 100 })}
                    className="max-w-32 bg-background border-border/60"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Badge className="badge-indigo border-0 text-xs">
                    PPN {(taxSettings.ppnRate * 100).toFixed(0)}% aktif
                  </Badge>
                </div>
              </div>
            )}

            {/* Service charge */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/40">
              <div>
                <p className="font-medium text-sm text-foreground">Biaya Layanan (Service Charge)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Biaya tambahan per transaksi untuk layanan
                </p>
              </div>
              <button
                id="toggle-service-charge"
                onClick={() => {
                  updateTaxSettings({ serviceChargeEnabled: !taxSettings.serviceChargeEnabled });
                  toast.success(`Biaya layanan ${!taxSettings.serviceChargeEnabled ? 'diaktifkan' : 'dinonaktifkan'}`);
                }}
                className="transition-colors cursor-pointer"
              >
                {taxSettings.serviceChargeEnabled ? (
                  <ToggleRight className="w-10 h-10 text-success" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                )}
              </button>
            </div>

            {taxSettings.serviceChargeEnabled && (
              <div className="space-y-2">
                <Label htmlFor="service-rate" className="text-sm font-medium">Tarif Biaya Layanan (%)</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="service-rate"
                    type="number"
                    value={(taxSettings.serviceChargeRate * 100).toFixed(0)}
                    onChange={(e) => updateTaxSettings({ serviceChargeRate: (parseFloat(e.target.value) || 0) / 100 })}
                    className="max-w-32 bg-background border-border/60"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            )}

            <Button
              id="btn-save-tax"
              onClick={() => toast.success('Pengaturan pajak disimpan')}
              className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
            >
              <Check size={14} className="mr-2" /> Simpan Pengaturan Pajak
            </Button>
          </div>
        </TabsContent>

        {/* ─── DISKON & PROMO ─── */}
        <TabsContent value="promos" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Create Promo Form */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 lg:col-span-1">
            <div>
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Plus size={16} className="text-primary" />
                Buat Promo Baru
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Jadwalkan kupon promo diskon kasir</p>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="promo-code" className="text-xs text-muted-foreground">Kode Promo (Caps, Tanpa Spasi) *</Label>
                <Input
                  id="promo-code"
                  placeholder="cth. DISKONBESAR"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                  className="bg-background border-border/60 text-sm h-10 uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-name" className="text-xs text-muted-foreground">Nama Deskripsi Promo *</Label>
                <Input
                  id="promo-name"
                  placeholder="cth. Promo Khusus Awal Bulan"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  className="bg-background border-border/60 text-sm h-10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-type" className="text-xs text-muted-foreground">Tipe Diskon</Label>
                  <Select
                    value={promoForm.type}
                    onValueChange={(val) => setPromoForm({ ...promoForm, type: val as PromoType })}
                  >
                    <SelectTrigger id="promo-type" className="w-full bg-background border-border/60 h-10 text-sm">
                      <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="Percentage">Persentase (%)</SelectItem>
                      <SelectItem value="Fixed">Potongan (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-value" className="text-xs text-muted-foreground">Nilai Diskon *</Label>
                  <Input
                    id="promo-value"
                    type="number"
                    placeholder={promoForm.type === 'Percentage' ? 'cth. 10' : 'cth. 15000'}
                    value={promoForm.value || ''}
                    onChange={(e) => setPromoForm({ ...promoForm, value: Number(e.target.value) })}
                    className="bg-background border-border/60 text-sm h-10"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-min" className="text-xs text-muted-foreground">Minimal Belanja (Rp) *</Label>
                <Input
                  id="promo-min"
                  type="number"
                  placeholder="cth. 50000"
                  value={promoForm.minPurchase || ''}
                  onChange={(e) => setPromoForm({ ...promoForm, minPurchase: Number(e.target.value) })}
                  className="bg-background border-border/60 text-sm h-10"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-start" className="text-xs text-muted-foreground">Mulai Aktif *</Label>
                  <Input
                    id="promo-start"
                    type="date"
                    value={promoForm.startDate}
                    onChange={(e) => setPromoForm({ ...promoForm, startDate: e.target.value })}
                    className="bg-background border-border/60 text-sm h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-end" className="text-xs text-muted-foreground">Selesai Aktif *</Label>
                  <Input
                    id="promo-end"
                    type="date"
                    value={promoForm.endDate}
                    onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                    className="bg-background border-border/60 text-sm h-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 text-xs shadow-lg cursor-pointer"
              >
                Jadwalkan Promo Aktif
              </Button>
            </form>
          </div>

          {/* Promo List */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 lg:col-span-2">
            <div>
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Tag size={16} className="text-success" />
                Daftar Promo Terjadwal
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Daftar kode diskon aktif yang sedang berjalan di kasir</p>
            </div>

            <div className="overflow-x-auto border border-border/40 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs py-2">Kode</TableHead>
                    <TableHead className="text-muted-foreground text-xs py-2">Promo</TableHead>
                    <TableHead className="text-muted-foreground text-xs py-2">Potongan</TableHead>
                    <TableHead className="text-muted-foreground text-xs py-2">Min. Belanja</TableHead>
                    <TableHead className="text-muted-foreground text-xs py-2">Periode</TableHead>
                    <TableHead className="text-muted-foreground text-xs py-2 w-16 text-center">Status</TableHead>
                    <TableHead className="text-muted-foreground text-xs py-2 w-12 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((p) => {
                    const isExpired = new Date() > new Date(p.endDate);
                    return (
                      <TableRow key={p.id} className="border-border/20 hover:bg-secondary/10">
                        <TableCell className="font-extrabold text-foreground py-2 text-xs">
                          <code className="px-1.5 py-0.5 rounded bg-zinc-950 text-primary border border-border/20">
                            {p.code}
                          </code>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground py-2 text-xs">
                          {p.name}
                        </TableCell>
                        <TableCell className="font-semibold text-primary py-2 text-xs">
                          {p.type === 'Percentage' ? `${p.value}%` : formatIDR(p.value)}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-2 text-xs">
                          {formatIDR(p.minPurchase)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="shrink-0" />
                            <span>
                              {new Date(p.startDate).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                              {' - '}
                              {new Date(p.endDate).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <button
                            onClick={() => handleTogglePromo(p.id, p.isActive, p.code)}
                            className="cursor-pointer"
                            disabled={isExpired}
                          >
                            {isExpired ? (
                              <Badge className="border-0 bg-zinc-800 text-zinc-500 text-[9px] px-1.5 py-0">Expired</Badge>
                            ) : p.isActive ? (
                              <Badge className="border-0 bg-success/10 text-success text-[9px] px-1.5 py-0">Aktif</Badge>
                            ) : (
                              <Badge className="border-0 bg-zinc-700/50 text-muted-foreground text-[9px] px-1.5 py-0">Nonaktif</Badge>
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <button
                            onClick={() => handleDeletePromo(p.id, p.code)}
                            className="text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Settings field helper ─────────────────────
function SettingsField({
  label,
  icon,
  value,
  editable,
  onChange,
  id,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </Label>
      {editable ? (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background border-border/60 text-sm h-10"
        />
      ) : (
        <div className="px-3 py-2.5 rounded-lg bg-secondary/40 border border-border/30 text-sm text-foreground">
          {value}
        </div>
      )}
    </div>
  );
}
