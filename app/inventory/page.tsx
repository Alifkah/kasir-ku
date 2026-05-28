'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle, History, Sliders } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Product, ProductCategory, ProductVariant, ProductModifier } from '@/types/pos';
import { formatIDR } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasPermission } from '@/lib/acl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type StockFilter = 'Semua' | 'Aman' | 'Menipis';

const CATEGORIES: ProductCategory[] = ['Makanan', 'Minuman', 'Ritel'];

const CATEGORY_COLORS: Record<string, string> = {
  Makanan: 'badge-warning',
  Minuman: 'badge-indigo',
  Ritel: 'badge-success',
};

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, adjustStockManual, activeOutlet, stockLedger, currentUser } = useStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [stockFilter, setStockFilter] = useState<StockFilter>('Semua');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Stock Ledger states
  const [selectedProductForLedger, setSelectedProductForLedger] = useState<Product | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const selectedProductLedger = selectedProductForLedger
    ? stockLedger.filter((entry) => entry.productId === selectedProductForLedger.id)
    : [];

  const openLedgerModal = (product: Product) => {
    setSelectedProductForLedger(product);
    setLedgerOpen(true);
  };

  // Stock Opname states
  const [opnameOpen, setOpnameOpen] = useState(false);
  const [opnameProduct, setOpnameProduct] = useState<Product | null>(null);
  const [opnameNewStock, setOpnameNewStock] = useState('');
  const [opnameNotes, setOpnameNotes] = useState('');

  const openOpnameModal = (product: Product) => {
    setOpnameProduct(product);
    setOpnameNewStock(String(product.stock));
    setOpnameNotes('');
    setOpnameOpen(true);
  };

  const handleSaveOpname = () => {
    if (!opnameProduct) return;
    const newStock = parseFloat(opnameNewStock);
    if (isNaN(newStock) || newStock < 0) {
      toast.error('Jumlah stok baru harus berupa angka valid');
      return;
    }
    adjustStockManual(opnameProduct.id, newStock, opnameNotes);
    setOpnameOpen(false);
    toast.success(`Berhasil menyesuaikan stok ${opnameProduct.name}`);
  };

  // Form state
  const [form, setForm] = useState({
    name: '', sku: '', category: 'Makanan' as ProductCategory,
    purchasePrice: '', sellingPrice: '', stock: '', minStock: '', description: '',
    unit: 'pcs',
    purchaseUnit: '',
    conversionRate: '',
    variants: [] as ProductVariant[],
    modifiers: [] as ProductModifier[],
    imageUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productImageName, setProductImageName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

  const addFormVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { id: `v-${Date.now()}`, name: '', priceDifference: 0 }],
    }));
  };

  const removeFormVariant = (id: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== id),
    }));
  };

  const updateFormVariant = (id: string, field: 'name' | 'priceDifference', val: any) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.id === id ? { ...v, [field]: val } : v)),
    }));
  };

  const addFormModifier = () => {
    setForm((prev) => ({
      ...prev,
      modifiers: [...prev.modifiers, { id: `m-${Date.now()}`, name: '', price: 0 }],
    }));
  };

  const removeFormModifier = (id: string) => {
    setForm((prev) => ({
      ...prev,
      modifiers: prev.modifiers.filter((m) => m.id !== id),
    }));
  };

  const updateFormModifier = (id: string, field: 'name' | 'price', val: any) => {
    setForm((prev) => ({
      ...prev,
      modifiers: prev.modifiers.map((m) => (m.id === id ? { ...m, [field]: val } : m)),
    }));
  };

  // Helper to generate SKU based on category abbreviation and name initials
  const generateSKU = (name: string, category: ProductCategory) => {
    const catPrefix = category === 'Makanan' ? 'MKN' : category === 'Minuman' ? 'MNM' : 'RTL';
    
    // Generate initials from name (take first letters of words, fallback to first 3 letters)
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
    let namePart = 'PRD';
    if (cleanName) {
      const words = cleanName.split(/\s+/);
      if (words.length === 1) {
        namePart = words[0].slice(0, 3).padEnd(3, 'X');
      } else if (words.length === 2) {
        namePart = (words[0][0] + words[1].slice(0, 2)).slice(0, 3).padEnd(3, 'X');
      } else {
        namePart = (words[0][0] + words[1][0] + words[2][0]).slice(0, 3);
      }
    }

    // Sequence number (count of items in this category + 1)
    const count = products.filter((p) => p.category === category).length + 1;
    const seqPart = String(count).padStart(3, '0');

    return `${catPrefix}-${namePart}-${seqPart}`;
  };

  const handleNameChange = (val: string) => {
    const updatedForm = { ...form, name: val };
    if (!editingProduct && !isSkuManuallyEdited) {
      updatedForm.sku = generateSKU(val, form.category);
    }
    setForm(updatedForm);
  };

  const handleCategoryChange = (val: ProductCategory) => {
    const updatedForm = { ...form, category: val };
    if (!editingProduct && !isSkuManuallyEdited) {
      updatedForm.sku = generateSKU(form.name, val);
    }
    setForm(updatedForm);
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'Semua' || p.category === categoryFilter;
    const stockStatus = p.stock <= 0 ? 'Habis' : p.stock <= p.minStock ? 'Menipis' : 'Aman';
    const matchStock = stockFilter === 'Semua' || stockStatus === stockFilter ||
      (stockFilter === 'Menipis' && (stockStatus === 'Menipis' || stockStatus === 'Habis'));
    return matchSearch && matchCategory && matchStock;
  });

  const openAddSheet = () => {
    setEditingProduct(null);
    setIsSkuManuallyEdited(false);
    setForm({
      name: '',
      sku: '',
      category: 'Makanan',
      purchasePrice: '',
      sellingPrice: '',
      stock: '',
      minStock: '',
      description: '',
      unit: 'pcs',
      purchaseUnit: '',
      conversionRate: '',
      variants: [],
      modifiers: [],
      imageUrl: '',
    });
    setProductImageUrl('');
    setProductImageName('');
    setSheetOpen(true);
  };

  const openEditSheet = (product: Product) => {
    setEditingProduct(product);
    setIsSkuManuallyEdited(true);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      stock: String(product.stock),
      minStock: String(product.minStock),
      description: product.description || '',
      unit: product.unit || 'pcs',
      purchaseUnit: product.purchaseUnit || '',
      conversionRate: product.conversionRate ? String(product.conversionRate) : '',
      variants: product.variants || [],
      modifiers: product.modifiers || [],
      imageUrl: product.imageUrl || '',
    });
    setProductImageUrl(product.imageUrl || '');
    setProductImageName(product.imageUrl ? (product.imageUrl.startsWith('data:') ? 'gambar_lokal.png' : product.imageUrl.split('/').pop() || 'gambar_produk') : '');
    setSheetOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB!');
      return;
    }

    setProductImageName(file.name);
    setUploading(true);

    try {
      // 1. Generate base64 for local fallback & offline use
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setProductImageUrl(base64data);
        setForm(prev => ({ ...prev, imageUrl: base64data }));
      };
      reader.readAsDataURL(file);

      // 2. Upload to Supabase Storage if configured
      if (isSupabaseConfigured) {
        const fileExt = file.name.split('.').pop();
        const fileName = `product-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (error) {
          console.warn('Storage upload error:', error.message);
          toast.warning('Gambar disimpan lokal (offline fallback) karena konfigurasi izin RLS Supabase Storage belum selesai.');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);
          
          setProductImageUrl(publicUrl);
          setForm(prev => ({ ...prev, imageUrl: publicUrl }));
          toast.success('Gambar produk berhasil diunggah ke cloud!');
        }
      } else {
        toast.info('Gambar produk disimpan secara lokal (offline mode)');
      }
    } catch (err) {
      console.error('Upload handler error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.sku || !form.sellingPrice) {
      toast.error('Lengkapi data produk yang wajib diisi');
      return;
    }
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: form.name, sku: form.sku,
        category: form.category,
        purchasePrice: parseInt(form.purchasePrice) || 0,
        sellingPrice: parseInt(form.sellingPrice) || 0,
        stock: parseFloat(form.stock) || 0,
        minStock: parseFloat(form.minStock) || 5,
        description: form.description,
        unit: form.unit,
        purchaseUnit: form.purchaseUnit || undefined,
        conversionRate: form.conversionRate ? parseFloat(form.conversionRate) : undefined,
        variants: form.variants,
        modifiers: form.modifiers,
        imageUrl: productImageUrl || undefined,
      });
      toast.success('Produk berhasil diperbarui');
    } else {
      addProduct({
        id: `prod-${Date.now()}`,
        name: form.name, sku: form.sku,
        category: form.category,
        purchasePrice: parseInt(form.purchasePrice) || 0,
        sellingPrice: parseInt(form.sellingPrice) || 0,
        stock: parseFloat(form.stock) || 0,
        minStock: parseFloat(form.minStock) || 5,
        description: form.description,
        outletId: activeOutlet.id,
        unit: form.unit,
        purchaseUnit: form.purchaseUnit || undefined,
        conversionRate: form.conversionRate ? parseFloat(form.conversionRate) : undefined,
        variants: form.variants,
        modifiers: form.modifiers,
        imageUrl: productImageUrl || undefined,
      });
      toast.success('Produk baru berhasil ditambahkan');
    }
    setSheetOpen(false);
  };

  const handleDelete = (productId: string) => {
    deleteProduct(productId);
    setDeleteConfirmId(null);
    toast.success('Produk berhasil dihapus');
  };

  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Barang & Stok</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola produk, harga, dan stok untuk {activeOutlet.name}
          </p>
        </div>
        {hasPermission(currentUser, 'manage_inventory') && (
          <Button
            id="btn-add-product"
            onClick={openAddSheet}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg glow-primary gap-2 shrink-0"
          >
            <Plus size={16} /> Tambah Produk Baru
          </Button>
        )}
      </div>

      {/* ── Alert cards ── */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex gap-3">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl badge-warning border flash-danger">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">{lowStockCount} produk stok menipis</span>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl badge-danger border">
              <Package size={16} />
              <span className="text-sm font-medium">{outOfStockCount} produk stok habis</span>
            </div>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="inventory-search"
            placeholder="Cari nama atau SKU produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/60"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
          <SelectTrigger id="category-filter" className="w-44 bg-card border-border/60">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="Semua">Semua Kategori</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={(v) => v && setStockFilter(v as StockFilter)}>
          <SelectTrigger id="stock-filter" className="w-44 bg-card border-border/60">
            <SelectValue placeholder="Status Stok" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="Semua">Semua Status</SelectItem>
            <SelectItem value="Aman">Stok Aman</SelectItem>
            <SelectItem value="Menipis">Stok Menipis / Habis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Produk</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Kategori</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Harga Beli (HPP)</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Harga Jual</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Stok</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Tidak ada produk yang ditemukan</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                const isOutOfStock = product.stock === 0;

                return (
                  <TableRow key={product.id} className="border-border/30 hover:bg-secondary/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/40 border border-border/45 overflow-hidden flex items-center justify-center shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => {
                                setPreviewUrl(product.imageUrl || null);
                                setPreviewName(product.name);
                              }}
                            />
                          ) : (
                            <Package className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-0 text-xs', CATEGORY_COLORS[product.category])}>
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatIDR(product.purchasePrice)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground">
                      {formatIDR(product.sellingPrice)}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-foreground">
                      {product.stock} <span className="text-xs text-muted-foreground font-medium">{product.unit || 'pcs'}</span>
                    </TableCell>
                    <TableCell>
                      {isOutOfStock ? (
                        <Badge className="badge-danger border-0 text-xs">Stok Habis</Badge>
                      ) : isLowStock ? (
                        <Badge className="badge-warning border-0 text-xs flash-danger">⚠ Stok Menipis</Badge>
                      ) : (
                        <Badge className="badge-success border-0 text-xs">✓ Stok Aman</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        {deleteConfirmId === product.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                            >
                              Yakin?
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Batal
                            </button>
                          </>
                         ) : (
                          <>
                            <button
                              id={`btn-ledger-${product.id}`}
                              onClick={() => openLedgerModal(product)}
                              className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              title="Riwayat Kartu Stok"
                            >
                              <History size={14} />
                            </button>
                            {hasPermission(currentUser, 'manage_inventory') && (
                              <>
                                <button
                                  id={`btn-opname-${product.id}`}
                                  onClick={() => openOpnameModal(product)}
                                  className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                  title="Koreksi Stok (Opname)"
                                >
                                  <Sliders size={14} />
                                </button>
                                <button
                                  id={`btn-edit-${product.id}`}
                                  onClick={() => openEditSheet(product)}
                                  className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  id={`btn-delete-${product.id}`}
                                  onClick={() => setDeleteConfirmId(product.id)}
                                  className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add/Edit Product Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[420px] bg-card border-border/60 p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
            <SheetTitle className="text-lg font-bold">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              {editingProduct
                ? 'Perbarui informasi dan stok produk'
                : 'Isi detail produk baru untuk ditambahkan ke inventori'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <FormField label="Nama Produk *" id="field-name">
              <Input
                id="field-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: Nasi Goreng Spesial"
                className="bg-background border-border/60"
              />
            </FormField>

            <FormField label="SKU *" id="field-sku">
              <Input
                id="field-sku"
                value={form.sku}
                onChange={(e) => {
                  setIsSkuManuallyEdited(true);
                  setForm({ ...form, sku: e.target.value });
                }}
                placeholder="Contoh: MKN-NGS-001"
                className="bg-background border-border/60 font-mono"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Kategori" id="field-category">
                <Select value={form.category} onValueChange={(v) => v && handleCategoryChange(v as ProductCategory)}>
                  <SelectTrigger id="field-category" className="bg-background border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Satuan Eceran" id="field-unit">
                <Select value={form.unit} onValueChange={(v) => v && setForm({ ...form, unit: v })}>
                  <SelectTrigger id="field-unit" className="bg-background border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="pcs">pcs (Pcs)</SelectItem>
                    <SelectItem value="kg">kg (Kilogram)</SelectItem>
                    <SelectItem value="gr">gr (Gram)</SelectItem>
                    <SelectItem value="porsi">porsi (Porsi)</SelectItem>
                    <SelectItem value="botol">botol (Botol)</SelectItem>
                    <SelectItem value="liter">liter (Liter)</SelectItem>
                    <SelectItem value="meter">meter (Meter)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {/* Konversi Satuan Grosir */}
            <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">📦</span>
                </div>
                <span className="text-sm font-semibold text-foreground">Konversi Satuan Grosir (Opsional)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Isi jika produk ini dibeli per karton/dus/ikat dan perlu dikonversi ke satuan eceran saat PO diterima.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Satuan Beli (Grosir)" id="field-purchase-unit">
                  <input
                    id="field-purchase-unit"
                    value={form.purchaseUnit}
                    onChange={(e) => setForm({ ...form, purchaseUnit: e.target.value })}
                    placeholder="Cth: karton, dus, ikat"
                    className="w-full h-9 px-3 text-sm rounded-md bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </FormField>
                <FormField label={`Isi per ${form.purchaseUnit || 'Satuan Grosir'}`} id="field-conversion-rate">
                  <input
                    id="field-conversion-rate"
                    type="number"
                    min="1"
                    step="1"
                    value={form.conversionRate}
                    onChange={(e) => setForm({ ...form, conversionRate: e.target.value })}
                    placeholder={`Cth: 24 ${form.unit || 'pcs'}`}
                    className="w-full h-9 px-3 text-sm rounded-md bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </FormField>
              </div>
              {form.purchaseUnit && form.conversionRate && (
                <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                  1 {form.purchaseUnit} = {form.conversionRate} {form.unit || 'pcs'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Harga Beli (HPP)" id="field-purchase">
                <Input
                  id="field-purchase"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  placeholder="0"
                  type="number"
                  className="bg-background border-border/60"
                />
              </FormField>
              <FormField label="Harga Jual *" id="field-selling">
                <Input
                  id="field-selling"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  placeholder="0"
                  type="number"
                  className="bg-background border-border/60"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Stok Awal" id="field-stock">
                <Input
                  id="field-stock"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="0"
                  type="number"
                  className="bg-background border-border/60"
                />
              </FormField>
              <FormField label="Min. Stok Alert" id="field-minstock">
                <Input
                  id="field-minstock"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  placeholder="5"
                  type="number"
                  className="bg-background border-border/60"
                />
              </FormField>
            </div>

            <FormField label="Deskripsi" id="field-description">
              <Textarea
                id="field-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat produk (opsional)..."
                className="bg-background border-border/60 resize-none"
                rows={3}
              />
            </FormField>

            <div className="space-y-2 border-t border-border/30 pt-3">
              <Label className="text-xs font-semibold text-muted-foreground">Gambar Produk</Label>
              {productImageUrl ? (
                <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-secondary/15">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={productImageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate max-w-[200px]">
                        {productImageName || 'gambar_produk.jpg'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(productImageUrl);
                          setPreviewName(productImageName || 'gambar_produk');
                        }}
                        className="text-[10px] text-primary hover:underline font-semibold block mt-0.5 cursor-pointer text-left"
                      >
                        Pratinjau Gambar ↗
                      </button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => {
                      setProductImageUrl('');
                      setProductImageName('');
                      setForm(prev => ({ ...prev, imageUrl: '' }));
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
                    id="product-image-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <Package className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">
                    {uploading ? 'Mengunggah...' : 'Pilih Gambar Produk'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, JPEG, atau WEBP (Maks. 5MB)</p>
                </div>
              )}
            </div>

            {/* Varian List */}
            <div className="space-y-3 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Varian Produk (Ukuran/Rasa)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFormVariant}
                  className="h-7 text-xs border-border/60 cursor-pointer"
                >
                  + Tambah Varian
                </Button>
              </div>
              {form.variants.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Tidak ada varian (dijual standar)</p>
              ) : (
                <div className="space-y-2">
                  {form.variants.map((v) => (
                    <div key={v.id} className="flex gap-2 items-center">
                      <Input
                        placeholder="Nama Varian (cth: Jumbo)"
                        value={v.name}
                        onChange={(e) => updateFormVariant(v.id, 'name', e.target.value)}
                        className="bg-background border-border/60 text-xs h-8 flex-1"
                      />
                      <Input
                        placeholder="Harga Tambah"
                        type="number"
                        value={v.priceDifference || ''}
                        onChange={(e) => updateFormVariant(v.id, 'priceDifference', parseInt(e.target.value) || 0)}
                        className="bg-background border-border/60 text-xs h-8 w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFormVariant(v.id)}
                        className="w-8 h-8 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modifikator List */}
            <div className="space-y-3 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Modifikator (Topping/Add-on)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFormModifier}
                  className="h-7 text-xs border-border/60 cursor-pointer"
                >
                  + Tambah Mod
                </Button>
              </div>
              {form.modifiers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Tidak ada modifikator tambahan</p>
              ) : (
                <div className="space-y-2">
                  {form.modifiers.map((m) => (
                    <div key={m.id} className="flex gap-2 items-center">
                      <Input
                        placeholder="Nama Mod (cth: Keju)"
                        value={m.name}
                        onChange={(e) => updateFormModifier(m.id, 'name', e.target.value)}
                        className="bg-background border-border/60 text-xs h-8 flex-1"
                      />
                      <Input
                        placeholder="Harga"
                        type="number"
                        value={m.price || ''}
                        onChange={(e) => updateFormModifier(m.id, 'price', parseInt(e.target.value) || 0)}
                        className="bg-background border-border/60 text-xs h-8 w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFormModifier(m.id)}
                        className="w-8 h-8 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-border/40 bg-muted/20 shrink-0 flex gap-3">
            <Button
              id="btn-save-product"
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary/90 text-white cursor-pointer"
            >
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              className="border-border/60 cursor-pointer"
            >
              Batal
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Stock Ledger Modal ── */}
      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="max-w-3xl bg-card border-border/60 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Kartu Stok & Riwayat Mutasi
            </DialogTitle>
            {selectedProductForLedger && (
              <div className="mt-1">
                <span className="text-sm font-semibold text-foreground">{selectedProductForLedger.name}</span>
                <span className="text-xs text-muted-foreground ml-2 font-mono">({selectedProductForLedger.sku})</span>
              </div>
            )}
          </DialogHeader>

          <div className="mt-4">
            <div className="rounded-xl border border-border/40 overflow-hidden bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent text-xs">
                    <TableHead className="text-muted-foreground font-semibold">Waktu</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Aktivitas</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right pr-6">Perubahan</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-center">Stok Akhir</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Referensi</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Petugas</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProductLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        Belum ada riwayat pergerakan stok untuk produk ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedProductLedger.map((entry) => (
                      <TableRow key={entry.id} className="border-border/20 text-xs hover:bg-secondary/15">
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            'border-0 text-[10px] font-semibold px-1.5 py-0.5',
                            entry.changeType === 'Penjualan' && 'bg-primary/10 text-primary border border-primary/20',
                            entry.changeType === 'Penerimaan PO' && 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
                            entry.changeType === 'Retur Penjualan' && 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
                            entry.changeType === 'Penyesuaian Manual' && 'bg-secondary text-secondary-foreground'
                          )}>
                            {entry.changeType}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(
                          'font-bold text-right pr-6',
                          entry.quantityChange > 0 ? 'text-emerald-500' : 'text-destructive'
                        )}>
                          {entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange} {selectedProductForLedger?.unit || 'pcs'}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-center">{entry.stockAfter} {selectedProductForLedger?.unit || 'pcs'}</TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">{entry.referenceId || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.createdBy}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[120px] truncate" title={entry.notes || undefined}>
                          {entry.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Stock Opname (Koreksi Stok) Modal ── */}
      <Dialog open={opnameOpen} onOpenChange={setOpnameOpen}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" /> Koreksi Stok (Stok Opname)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Sesuaikan kuantitas stok produk secara manual ke sistem dan rekam alasannya.
            </DialogDescription>
          </DialogHeader>

          {opnameProduct && (
            <div className="space-y-4 pt-2">
              <div className="bg-secondary/25 p-3 rounded-lg border border-border/40">
                <p className="text-xs text-muted-foreground">Produk yang disesuaikan:</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{opnameProduct.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{opnameProduct.sku}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Stok Saat Ini (Sistem)</Label>
                  <div className="h-9 px-3 flex items-center bg-muted/30 rounded-md border border-border/60 text-sm font-bold text-foreground mt-1">
                    {opnameProduct.stock} {opnameProduct.unit || 'pcs'}
                  </div>
                </div>

                <div>
                  <Label htmlFor="opname-new-stock" className="text-xs text-muted-foreground font-semibold">Stok Fisik Sebenarnya *</Label>
                  <Input
                    id="opname-new-stock"
                    type="number"
                    min="0"
                    step="0.01"
                    value={opnameNewStock}
                    onChange={(e) => setOpnameNewStock(e.target.value)}
                    className="bg-background border-border/60 h-9 mt-1 text-sm font-bold"
                  />
                </div>
              </div>

              {/* Selisih preview */}
              {(() => {
                const diff = (parseFloat(opnameNewStock) || 0) - opnameProduct.stock;
                return (
                  <div className={cn(
                    "text-xs px-3 py-2 rounded-lg border flex items-center justify-between",
                    diff === 0 && "bg-secondary/20 border-border/40 text-muted-foreground",
                    diff > 0 && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-semibold",
                    diff < 0 && "bg-destructive/10 border-destructive/20 text-destructive font-semibold"
                  )}>
                    <span>Selisih Penyesuaian:</span>
                    <span>{diff > 0 ? `+${diff}` : diff} {opnameProduct.unit || 'pcs'}</span>
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <Label htmlFor="opname-notes" className="text-xs text-muted-foreground font-semibold">Alasan Koreksi / Catatan *</Label>
                <Textarea
                  id="opname-notes"
                  placeholder="Contoh: Barang rusak, Selisih hitung opname bulanan..."
                  value={opnameNotes}
                  onChange={(e) => setOpnameNotes(e.target.value)}
                  className="bg-background border-border/60 text-xs resize-none"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2.5">
                <Button
                  id="btn-save-opname"
                  onClick={handleSaveOpname}
                  disabled={!opnameNotes.trim() || isNaN(parseFloat(opnameNewStock)) || parseFloat(opnameNewStock) < 0}
                  className="flex-1 bg-primary hover:bg-primary/95 text-white animate-pulse-subtle"
                >
                  Simpan Penyesuaian
                </Button>
                <Button variant="outline" onClick={() => setOpnameOpen(false)} className="border-border/60">
                  Batal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Image Preview Dialog ── */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-md border border-border/60 p-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground truncate">
              Pratinjau Gambar: {previewName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2 bg-secondary/20 rounded-xl border border-border/40 mt-3 overflow-hidden">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={previewName}
                className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
              />
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => setPreviewUrl(null)}
              className="w-full bg-primary hover:bg-primary/95 text-white"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}
