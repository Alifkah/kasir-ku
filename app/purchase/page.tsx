'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { 
  Plus, 
  Truck, 
  Trash2, 
  FileText, 
  CheckCircle, 
  Package, 
  Building,
  User,
  Phone,
  MapPin,
  Mail,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Supplier, PurchaseOrder, PurchaseOrderItem, Product } from '@/types/pos';
import { formatIDR } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useHasHydrated } from '@/lib/useHasHydrated';
import { hasPermission } from '@/lib/acl';

export default function PurchasePage() {
  const hasHydrated = useHasHydrated();
  const {
    suppliers,
    purchaseOrders,
    products,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    activeOutlet,
    currentUser
  } = useStore();

  const [activeTab, setActiveTab] = useState<'po' | 'supplier'>('po');
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  
  // Supplier Form state
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
  });

  // PO Form state
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState<Omit<PurchaseOrderItem, 'subtotal'>[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemCost, setItemCost] = useState('');

  // Skeletons while hydrating
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground font-medium">Memuat Data Pembelian...</p>
        </div>
      </div>
    );
  }

  // Restrict access: Check manage_suppliers_po permission
  if (!hasPermission(currentUser, 'manage_suppliers_po')) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-7rem)] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive border border-destructive/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Akses Ditolak</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Maaf, halaman Pembelian & Supplier hanya dapat diakses oleh pengguna dengan izin <strong>manage_suppliers_po</strong>.
        </p>
      </div>
    );
  }

  // --- Supplier CRUD Actions ---
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '' });
    setSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      contactName: s.contactName || '',
      phone: s.phone,
      email: s.email || '',
      address: s.address,
    });
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = () => {
    if (!supplierForm.name || !supplierForm.phone || !supplierForm.address) {
      toast.error('Lengkapi Nama Supplier, Telepon, dan Alamat');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: supplierForm.name,
        contactName: supplierForm.contactName,
        phone: supplierForm.phone,
        email: supplierForm.email,
        address: supplierForm.address,
      });
      toast.success('Supplier berhasil diperbarui');
    } else {
      const newSup: Supplier = {
        id: `SUP-${Date.now().toString().slice(-4)}`,
        name: supplierForm.name,
        contactName: supplierForm.contactName || undefined,
        phone: supplierForm.phone,
        email: supplierForm.email || undefined,
        address: supplierForm.address,
      };
      addSupplier(newSup);
      toast.success('Supplier baru ditambahkan');
    }
    setSupplierModalOpen(false);
  };

  const handleDeleteSup = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus supplier ini?')) {
      deleteSupplier(id);
      toast.success('Supplier berhasil dihapus');
    }
  };

  // --- PO Actions ---
  const handleOpenAddPo = () => {
    setEditingPo(null);
    setPoSupplierId('');
    setPoItems([]);
    setSelectedProductId('');
    setItemQty('1');
    setItemCost('');
    setPoModalOpen(true);
  };

  const handleOpenEditPo = (po: PurchaseOrder) => {
    setEditingPo(po);
    setPoSupplierId(po.supplierId);
    setPoItems(po.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      costPrice: item.costPrice,
      purchaseUnit: item.purchaseUnit,
      conversionRate: item.conversionRate,
    })));
    setSelectedProductId('');
    setItemQty('1');
    setItemCost('');
    setPoModalOpen(true);
  };

  const handleAddPoItem = () => {
    if (!selectedProductId) {
      toast.error('Pilih produk terlebih dahulu');
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const qty = parseInt(itemQty, 10);
    const cost = parseInt(itemCost.replace(/\D/g, ''), 10);

    if (isNaN(qty) || qty <= 0) {
      toast.error('Jumlah produk harus lebih dari 0');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error('Harga beli produk harus valid');
      return;
    }

    // Check if product already exists in item list
    const existingIndex = poItems.findIndex(i => i.productId === selectedProductId);
    if (existingIndex > -1) {
      const updated = [...poItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].costPrice = cost;
      setPoItems(updated);
    } else {
      setPoItems([
        ...poItems,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          costPrice: cost,
          purchaseUnit: product.purchaseUnit || undefined,
          conversionRate: product.conversionRate || undefined,
        }
      ]);
    }

    // Reset item inputs
    setSelectedProductId('');
    setItemQty('1');
    setItemCost('');
    const unitLabel = product.purchaseUnit || product.unit || 'pcs';
    toast.success(`${product.name} dimasukkan ke draf PO (${qty} ${unitLabel})`);
  };

  const handleRemovePoItem = (productId: string) => {
    setPoItems(poItems.filter(item => item.productId !== productId));
  };

  const handleSavePo = (status: 'Draft' | 'Dipesan') => {
    if (!poSupplierId) {
      toast.error('Pilih Supplier terlebih dahulu');
      return;
    }
    if (poItems.length === 0) {
      toast.error('Draf item PO kosong!');
      return;
    }

    const supplier = suppliers.find(s => s.id === poSupplierId);
    if (!supplier) return;

    const calculatedItems: PurchaseOrderItem[] = poItems.map(item => ({
      ...item,
      subtotal: item.quantity * item.costPrice,
    }));

    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);

    if (editingPo) {
      updatePurchaseOrder(editingPo.id, {
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: calculatedItems,
        totalAmount,
        status,
      });
      toast.success(status === 'Dipesan' ? 'PO berhasil diperbarui & dipesan!' : 'Perubahan draf PO berhasil disimpan.');
    } else {
      const newPO: PurchaseOrder = {
        id: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: calculatedItems,
        totalAmount,
        status,
        dateCreated: new Date(),
        outletId: activeOutlet.id,
      };
      addPurchaseOrder(newPO);
      toast.success(status === 'Dipesan' ? 'PO berhasil dikirim ke supplier!' : 'Draf PO berhasil disimpan.');
    }
    setPoModalOpen(false);
    setEditingPo(null);
  };

  const handleReceivePo = (poId: string) => {
    receivePurchaseOrder(poId);
    toast.success(`Barang PO ${poId} berhasil diterima. Stok otomatis ditambahkan!`);
  };

  const handleCancelPo = (poId: string) => {
    if (confirm('Batalkan Purchase Order ini?')) {
      updatePurchaseOrder(poId, { status: 'Dibatalkan' });
      toast.success(`PO ${poId} dibatalkan`);
    }
  };

  // --- Calculations ---
  const totalPOAmount = purchaseOrders.reduce((sum, p) => sum + p.totalAmount, 0);
  const pendingPO = purchaseOrders.filter(p => p.status === 'Dipesan');
  const receivedPO = purchaseOrders.filter(p => p.status === 'Diterima');

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Pembelian & Supplier
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola rantai pasok, ketersediaan barang (Purchase Order), dan relasi supplier outlet {activeOutlet.name}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'po' ? (
            <Button
              id="btn-add-po"
              onClick={handleOpenAddPo}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg glow-primary gap-2"
            >
              <Plus size={16} /> Buat PO Baru
            </Button>
          ) : (
            <Button
              id="btn-add-supplier"
              onClick={handleOpenAddSupplier}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg glow-primary gap-2"
            >
              <Plus size={16} /> Tambah Supplier
            </Button>
          )}
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Total Supplier</p>
            <p className="text-xl font-bold text-foreground">{suppliers.length} Ritel/Vendor</p>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">PO Dipesan (Menunggu)</p>
            <p className="text-xl font-bold text-warning">{pendingPO.length} Transaksi</p>
            <p className="text-[10px] text-muted-foreground">Nilai: {formatIDR(pendingPO.reduce((s, p) => s + p.totalAmount, 0))}</p>
          </div>
        </div>

        <div className="metric-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">PO Diterima (Selesai)</p>
            <p className="text-xl font-bold text-emerald-500">{receivedPO.length} Transaksi</p>
            <p className="text-[10px] text-muted-foreground">Total Belanja: {formatIDR(receivedPO.reduce((s, p) => s + p.totalAmount, 0))}</p>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-border/40 gap-4">
        <button
          onClick={() => setActiveTab('po')}
          className={cn(
            'pb-3 text-sm font-semibold transition-all relative cursor-pointer',
            activeTab === 'po'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Purchase Orders (PO)
        </button>
        <button
          onClick={() => setActiveTab('supplier')}
          className={cn(
            'pb-3 text-sm font-semibold transition-all relative cursor-pointer',
            activeTab === 'supplier'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Daftar Supplier
        </button>
      </div>

      {/* ── Content View ── */}
      {activeTab === 'po' ? (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold">ID PO</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Tanggal Pembuatan</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Supplier</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Jumlah Item</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Total Biaya</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Belum ada rekaman Purchase Order (PO)</p>
                  </TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((po) => (
                  <TableRow key={po.id} className="border-border/30 hover:bg-secondary/20">
                    <TableCell className="font-mono text-xs text-primary font-bold">{po.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(po.dateCreated), 'dd MMM yyyy HH:mm', { locale: localeID })}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{po.supplierName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po.items.reduce((sum, item) => sum + item.quantity, 0)} pcs ({po.items.length} produk)
                    </TableCell>
                    <TableCell className="text-sm font-bold text-foreground">{formatIDR(po.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        'border-0 text-xs font-semibold px-2 py-0.5',
                        po.status === 'Draft' && 'bg-secondary text-secondary-foreground',
                        po.status === 'Dipesan' && 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                        po.status === 'Diterima' && 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
                        po.status === 'Dibatalkan' && 'bg-destructive/10 text-destructive border border-destructive/20'
                      )}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1.5 py-3">
                      {po.status === 'Dipesan' && (
                        <>
                          <Button
                            id={`btn-edit-po-${po.id}`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditPo(po)}
                            className="h-7.5 px-2 text-[11px] rounded border-border/85 hover:bg-secondary"
                          >
                            Ubah
                          </Button>
                          <Button
                            id={`btn-receive-po-${po.id}`}
                            size="sm"
                            onClick={() => handleReceivePo(po.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7.5 px-2 text-[11px] rounded"
                          >
                            Terima Barang
                          </Button>
                          <Button
                            id={`btn-cancel-po-${po.id}`}
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelPo(po.id)}
                            className="h-7.5 px-2 text-[11px] rounded bg-red-600 hover:bg-red-700"
                          >
                            Batalkan
                          </Button>
                        </>
                      )}
                      {po.status === 'Draft' && (
                        <>
                          <Button
                            id={`btn-edit-po-${po.id}`}
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditPo(po)}
                            className="h-7.5 px-2 text-[11px] rounded border-border/85 hover:bg-secondary mr-1"
                          >
                            Ubah
                          </Button>
                          <Button
                            id={`btn-order-po-${po.id}`}
                            size="sm"
                            onClick={() => updatePurchaseOrder(po.id, { status: 'Dipesan' })}
                            className="bg-primary hover:bg-primary/95 text-white h-7.5 px-2.5 text-[11px] rounded"
                          >
                            Pesan Barang
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold">Nama Supplier</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Kontak Person</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Nomor HP/Telp</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Alamat</TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Building className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Belum ada mitra supplier terdaftar</p>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((sup) => (
                  <TableRow key={sup.id} className="border-border/30 hover:bg-secondary/20">
                    <TableCell className="font-semibold text-foreground text-sm">{sup.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sup.contactName || '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{sup.phone}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{sup.address}</TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          id={`btn-edit-sup-${sup.id}`}
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenEditSupplier(sup)}
                          className="h-8 text-xs"
                        >
                          Ubah
                        </Button>
                        <button
                          id={`btn-delete-sup-${sup.id}`}
                          onClick={() => handleDeleteSup(sup.id)}
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
      )}

      {/* ── Supplier Edit/Add Dialog ── */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingSupplier ? 'Ubah Informasi Supplier' : 'Registrasi Supplier Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name" className="text-xs font-semibold text-muted-foreground">Nama Perusahaan / Supplier *</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sup-name"
                  placeholder="CV. Sumber Makmur Utama"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="bg-background pl-9 border-border/60"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-contact" className="text-xs font-semibold text-muted-foreground">Kontak Person</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="sup-contact"
                    placeholder="Budi"
                    value={supplierForm.contactName}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
                    className="bg-background pl-9 border-border/60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sup-phone" className="text-xs font-semibold text-muted-foreground">Nomor Telepon / HP *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="sup-phone"
                    placeholder="0812XXXXXXXX"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="bg-background pl-9 border-border/60"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-email" className="text-xs font-semibold text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sup-email"
                  placeholder="info@sumbermakmur.com"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="bg-background pl-9 border-border/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-address" className="text-xs font-semibold text-muted-foreground">Alamat Kantor/Gudang *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  id="sup-address"
                  placeholder="Jln. Raya Industri No. 45, Jakarta"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="bg-background pl-9 border-border/60"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2.5">
              <Button
                id="btn-save-supplier-confirm"
                onClick={handleSaveSupplier}
                className="flex-1 bg-primary hover:bg-primary/95 text-white"
              >
                {editingSupplier ? 'Simpan Perubahan' : 'Daftarkan Supplier'}
              </Button>
              <Button variant="outline" onClick={() => setSupplierModalOpen(false)} className="border-border/60">
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Purchase Order (PO) Dialog ── */}
      <Dialog open={poModalOpen} onOpenChange={setPoModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border/60 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingPo ? `Ubah Purchase Order (${editingPo.id})` : 'Buat Purchase Order Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
            {/* Choose Supplier */}
            <div className="space-y-1.5">
              <Label htmlFor="po-supplier-select" className="text-xs font-semibold text-muted-foreground uppercase">
                Pilih Mitra Supplier *
              </Label>
              <Select value={poSupplierId} onValueChange={(val) => setPoSupplierId(val || '')}>
                <SelectTrigger id="po-supplier-select" className="bg-background border-border/60">
                  <SelectValue placeholder="Pilih supplier penerima pesanan..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.contactName || 'Ritel'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PO Item Builder Card */}
            <div className="p-4 rounded-xl border border-border/50 bg-secondary/25 space-y-4">
              <Label className="text-xs font-bold text-primary uppercase tracking-wider block">
                Tambah Item / Produk ke PO
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="po-product-select" className="text-[11px] text-muted-foreground">Pilih Produk</Label>
                  <Select value={selectedProductId} onValueChange={(val) => setSelectedProductId(val || '')}>
                    <SelectTrigger id="po-product-select" className="bg-background border-border/60 h-9 text-xs">
                      <SelectValue placeholder="Pilih barang..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border max-h-52">
                      {products
                        .filter(p => p.outletId === activeOutlet.id)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (Stok: {p.stock} | HPP Lama: {formatIDR(p.purchasePrice)})
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="po-qty" className="text-[11px] text-muted-foreground">
                    Kuantitas ({(() => {
                      const prod = selectedProductId ? products.find(p => p.id === selectedProductId) : null;
                      return prod?.purchaseUnit || prod?.unit || 'pcs';
                    })()})
                  </Label>
                  <Input
                    id="po-qty"
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="bg-background border-border/60 h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="po-cost" className="text-[11px] text-muted-foreground">Harga Beli Baru (HPP PO - Rp)</Label>
                  <Input
                    id="po-cost"
                    placeholder="Masukkan harga beli dari supplier..."
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value.replace(/\D/g, ''))}
                    className="bg-background border-border/60 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Conversion Preview */}
              {(() => {
                const selectedProd = selectedProductId ? products.find(p => p.id === selectedProductId) : null;
                const purchUnit = selectedProd?.purchaseUnit;
                const convRate = selectedProd?.conversionRate;
                const retailUnit = selectedProd?.unit || 'pcs';
                const qty = parseInt(itemQty, 10) || 0;
                if (purchUnit && convRate && qty > 0) {
                  return (
                    <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                      <span className="text-base">📦</span>
                      <span>
                        {qty} {purchUnit} × {convRate} = <strong>{qty * convRate} {retailUnit}</strong> yang akan ditambahkan ke stok saat PO diterima
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <Button
                id="btn-add-item-to-po"
                type="button"
                variant="secondary"
                onClick={handleAddPoItem}
                className="w-full text-xs h-9 border border-border/80 hover:bg-secondary"
              >
                + Masukkan Item PO
              </Button>
            </div>

            {/* List of Added Items */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Daftar Barang Draf PO
              </Label>
              <div className="border border-border/40 rounded-xl overflow-hidden bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent h-9 text-xs">
                      <TableHead className="text-muted-foreground font-semibold py-1">SKU</TableHead>
                      <TableHead className="text-muted-foreground font-semibold py-1">Produk</TableHead>
                      <TableHead className="text-muted-foreground font-semibold py-1">Jumlah</TableHead>
                      <TableHead className="text-muted-foreground font-semibold py-1">Harga Beli</TableHead>
                      <TableHead className="text-muted-foreground font-semibold py-1">Subtotal</TableHead>
                      <TableHead className="text-right text-muted-foreground font-semibold py-1">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          Belum ada item ditambahkan ke Purchase Order ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      poItems.map((item) => (
                        <TableRow key={item.productId} className="border-border/20 text-xs hover:bg-secondary/10 h-10">
                          <TableCell className="font-mono">{item.sku}</TableCell>
                          <TableCell className="font-medium text-foreground">{item.productName}</TableCell>
                          <TableCell>
                            {item.quantity} {item.purchaseUnit || item.conversionRate ? (item.purchaseUnit || 'pcs') : 'pcs'}
                            {item.purchaseUnit && item.conversionRate && (
                              <span className="text-[10px] text-muted-foreground ml-1">
                                (= {item.quantity * item.conversionRate} {products.find(p => p.id === item.productId)?.unit || 'pcs'})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{formatIDR(item.costPrice)}</TableCell>
                          <TableCell className="font-bold">{formatIDR(item.quantity * item.costPrice)}</TableCell>
                          <TableCell className="text-right py-1">
                            <button
                              id={`btn-remove-po-item-${item.productId}`}
                              type="button"
                              onClick={() => handleRemovePoItem(item.productId)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10"
                            >
                              <Trash2 size={12} />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Pricing Summary & Save buttons */}
          <div className="pt-4 border-t border-border/40 space-y-4">
            <div className="flex justify-between items-center bg-zinc-950/20 p-3 rounded-lg border border-border/25">
              <div>
                <p className="text-xs text-muted-foreground">Total Estimasi Nilai PO</p>
                <p className="text-lg font-black text-primary mt-0.5">
                  {formatIDR(poItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0))}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {poItems.length} produk diusulkan
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                id="btn-save-po-ordered"
                onClick={() => handleSavePo('Dipesan')}
                className="flex-1 bg-primary hover:bg-primary/95 text-white"
              >
                Pesan & Kirim PO
              </Button>
              <Button
                id="btn-save-po-draft"
                variant="secondary"
                onClick={() => handleSavePo('Draft')}
                className="border border-border/60"
              >
                Simpan Draf
              </Button>
              <Button variant="outline" onClick={() => setPoModalOpen(false)} className="border-border/60">
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
