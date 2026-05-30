'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ScanLine,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  CreditCard,
  Banknote,
  QrCode,
  X,
  Check,
  Clock,
  MessageCircle,
  Mail,
  Send,
  Loader2,
  Printer,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { useStore, useCartTotal } from '@/store/useStore';
import { Product, ProductCategory, PaymentMethod, CartItem, ProductVariant, ProductModifier } from '@/types/pos';
import { formatIDR } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useHasHydrated } from '@/lib/useHasHydrated';
import ShiftModal from '@/components/pos/ShiftModal';
import VariantModal from '@/components/pos/VariantModal';
import { printThermalReceipt } from '@/lib/exportUtils';

const CATEGORIES: { value: ProductCategory | 'Semua'; label: string }[] = [
  { value: 'Semua', label: 'Semua' },
  { value: 'Makanan', label: 'Makanan' },
  { value: 'Minuman', label: 'Minuman' },
  { value: 'Ritel', label: 'Ritel' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: 'Tunai', label: 'Tunai (Cash)', icon: Banknote },
  { value: 'Debit/Kredit', label: 'Debit / Kredit', icon: CreditCard },
  { value: 'QRIS', label: 'QRIS', icon: QrCode },
];

const CATEGORY_EMOJI: Record<string, string> = {
  Makanan: '🍽️',
  Minuman: '🥤',
  Ritel: '🛒',
};

export default function POSPage() {
  const hasHydrated = useHasHydrated();
  const {
    cart,
    products,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    updateCartItem,
    clearCart,
    voucherDiscount,
    setVoucherDiscount,
    addTransaction,
    activeOutlet,
    taxSettings,
    customers,
    selectedCustomer,
    setSelectedCustomer,
    pointsToRedeem,
    setPointsToRedeem,
    promos,
    activePromo,
    setActivePromo,
    currentUser,
    activeShift,
    businessProfile,
    pendingOrders,
    savePendingOrder,
    loadPendingOrder,
    deletePendingOrder,
  } = useStore();

  const {
    subtotal,
    memberDiscount,
    promoDiscount,
    pointsDiscount,
    totalDiscount,
    taxAmount,
    total,
    pointsEarned,
  } = useCartTotal();

  const maxAmountBeforePoints = Math.max(0, subtotal - (memberDiscount + promoDiscount + voucherDiscount));
  const maxPointsForPurchase = Math.floor(maxAmountBeforePoints / 100);
  const maxAllowedToRedeem = selectedCustomer ? Math.min(selectedCustomer.points, maxPointsForPurchase) : 0;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'Semua'>('Semua');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  
  // Pending orders states
  const [pendingOpen, setPendingOpen] = useState(false);
  const [savePendingOpen, setSavePendingOpen] = useState(false);
  const [pendingNote, setPendingNote] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('Tunai');
  const [voucherInput, setVoucherInput] = useState('');
  const [cashInput, setCashInput] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // QRIS dynamic states
  const [qrisLoading, setQrisLoading] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);

  // Digital receipt states
  const [sendReceiptOpen, setSendReceiptOpen] = useState(false);
  const [receiptPhone, setReceiptPhone] = useState('');
  const [receiptEmail, setReceiptEmail] = useState('');
  const [sendingReceipt, setSendingReceipt] = useState(false);

  // Shift & Cash Drawer states
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<'open' | 'close'>('open');

  // Variant/modifiers customization states
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState<Product | null>(null);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [activePosTab, setActivePosTab] = useState<'products' | 'cart'>('products');

  // Enforce shift opening for cashiers
  useEffect(() => {
    if (hasHydrated && currentUser?.role === 'Cashier' && !activeShift) {
      setShiftModalMode('open');
      setShiftModalOpen(true);
    } else {
      if (currentUser?.role !== 'Cashier' || activeShift) {
        setShiftModalOpen(false);
      }
    }
  }, [hasHydrated, currentUser, activeShift]);

  // Filter products by active category, search string, and active outlet
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesOutlet = p.outletId === activeOutlet.id;
      const matchesCategory = activeCategory === 'Semua' || p.category === activeCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      return matchesOutlet && matchesCategory && matchesSearch;
    });
  }, [products, search, activeCategory, activeOutlet]);

  const handleProductClick = (product: Product) => {
    if (product.stock === 0) {
      toast.error('Stok produk habis!');
      return;
    }

    // Check if the total quantity of this product in cart is already equal to or exceeds its stock
    const qtyInCart = cart
      .filter((item) => item.product.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (qtyInCart >= product.stock) {
      toast.error('Stok produk tidak mencukupi!');
      return;
    }

    const hasVariants = product.variants && product.variants.length > 0;
    const hasModifiers = product.modifiers && product.modifiers.length > 0;

    if (hasVariants || hasModifiers) {
      setSelectedProductForCustomization(product);
      setVariantModalOpen(true);
    } else {
      addToCart(product);
      toast.success(`${product.name} ditambahkan ke keranjang`);
    }
  };

  const handleConfirmCustomization = (variant?: ProductVariant, modifiers?: ProductModifier[]) => {
    if (selectedProductForCustomization) {
      if (editingCartItem) {
        updateCartItem(
          editingCartItem.product.id,
          editingCartItem.selectedVariant,
          editingCartItem.selectedModifiers,
          variant,
          modifiers,
          editingCartItem.quantity
        );
        toast.success(`Kustomisasi ${selectedProductForCustomization.name} berhasil diperbarui`);
      } else {
        addToCart(selectedProductForCustomization, variant, modifiers);
        toast.success(`${selectedProductForCustomization.name} ditambahkan ke keranjang`);
      }
      setSelectedProductForCustomization(null);
      setEditingCartItem(null);
    }
  };

  const handleApplyVoucher = () => {
    const discount = parseInt(voucherInput.replace(/\D/g, ''), 10) || 0;
    setVoucherDiscount(discount);
    toast.success(`Voucher diskon ${formatIDR(discount)} diterapkan`);
  };

  const handleOpenSavePending = () => {
    if (cart.length === 0) return;
    setPendingNote(selectedCustomer ? selectedCustomer.name : `Meja ${pendingOrders.length + 1}`);
    setSavePendingOpen(true);
  };

  const handleConfirmSavePending = () => {
    savePendingOrder(pendingNote);
    toast.success('Pesanan berhasil ditahan!');
    setSavePendingOpen(false);
  };

  const handleLoadPending = (id: string) => {
    loadPendingOrder(id);
    toast.success('Pesanan berhasil dimuat kembali!');
    setPendingOpen(false);
  };

  const handleCheckout = () => {
    if (currentUser?.role === 'Cashier' && !activeShift) {
      toast.error('Anda harus membuka shift terlebih dahulu!');
      setShiftModalMode('open');
      setShiftModalOpen(true);
      return;
    }
    if (cart.length === 0) {
      toast.error('Keranjang kosong!');
      return;
    }
    setCheckoutOpen(true);
    setPaymentSuccess(false);
    setCashInput('');
    setQrisUrl(null);
  };

  // Generate dynamic QRIS when QRIS payment selected
  useEffect(() => {
    if (selectedPayment === 'QRIS' && checkoutOpen && !paymentSuccess) {
      setQrisLoading(true);
      const amount = Math.max(0, total);
      const qrisData = `KASIRKU-QRIS-${activeOutlet.id}-${amount}-${Date.now()}`;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrisData)}&margin=10&bgcolor=ffffff`;
      setQrisUrl(url);
      // Simulate network delay for premium feel
      const t = setTimeout(() => setQrisLoading(false), 800);
      return () => clearTimeout(t);
    }
  }, [selectedPayment, checkoutOpen, paymentSuccess, total, activeOutlet.id]);

  // Send digital receipt via WhatsApp
  const handleSendWhatsApp = () => {
    if (!lastTransaction) return;
    const phone = receiptPhone.replace(/\D/g, '');
    if (!phone) { toast.error('Masukkan nomor WhatsApp terlebih dahulu!'); return; }
    setSendingReceipt(true);
    const items = lastTransaction.items
      .map((item: any) => `• ${item.productName} (${item.quantity}x) = ${formatIDR(item.subtotal)}`)
      .join('%0A');
    const msg = `*Struk Digital KasirKu*%0A` +
      `No: ${lastTransaction.id}%0A` +
      `Outlet: ${lastTransaction.outletName}%0A` +
      `Kasir: ${lastTransaction.cashierName}%0A` +
      `Tgl: ${new Date(lastTransaction.timestamp).toLocaleString('id-ID')}%0A%0A` +
      `*Item:*%0A${items}%0A%0A` +
      `Subtotal: ${formatIDR(lastTransaction.subtotal)}%0A` +
      (lastTransaction.discount > 0 ? `Diskon: -${formatIDR(lastTransaction.discount)}%0A` : '') +
      (lastTransaction.taxAmount > 0 ? `PPN: ${formatIDR(lastTransaction.taxAmount)}%0A` : '') +
      `*TOTAL: ${formatIDR(lastTransaction.totalPaid)}*%0A` +
      `Metode: ${lastTransaction.paymentMethod}%0A%0A` +
      `_Terima kasih telah berbelanja!_`;
    setTimeout(() => {
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      setSendingReceipt(false);
      setSendReceiptOpen(false);
      toast.success('Membuka WhatsApp...');
    }, 600);
  };

  // Send digital receipt via Email (mailto)
  const handleSendEmail = () => {
    if (!lastTransaction) return;
    if (!receiptEmail || !receiptEmail.includes('@')) { toast.error('Masukkan email yang valid!'); return; }
    setSendingReceipt(true);
    const items = lastTransaction.items
      .map((item: any) => `${item.productName} (${item.quantity}x) = ${formatIDR(item.subtotal)}`)
      .join('\n');
    const body = `Struk Digital KasirKu\n\n` +
      `No Struk: ${lastTransaction.id}\n` +
      `Outlet: ${lastTransaction.outletName}\n` +
      `Kasir: ${lastTransaction.cashierName}\n` +
      `Tanggal: ${new Date(lastTransaction.timestamp).toLocaleString('id-ID')}\n\n` +
      `Item:\n${items}\n\n` +
      `Subtotal: ${formatIDR(lastTransaction.subtotal)}\n` +
      (lastTransaction.discount > 0 ? `Diskon: -${formatIDR(lastTransaction.discount)}\n` : '') +
      (lastTransaction.taxAmount > 0 ? `PPN: ${formatIDR(lastTransaction.taxAmount)}\n` : '') +
      `TOTAL: ${formatIDR(lastTransaction.totalPaid)}\n` +
      `Metode Pembayaran: ${lastTransaction.paymentMethod}\n\n` +
      `Terima kasih telah berbelanja di ${lastTransaction.outletName}!`;
    const subject = `Struk Digital - ${lastTransaction.id} - ${lastTransaction.outletName}`;
    setTimeout(() => {
      window.location.href = `mailto:${receiptEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setSendingReceipt(false);
      setSendReceiptOpen(false);
      toast.success('Membuka aplikasi email...');
    }, 600);
  };

  const handleConfirmPayment = () => {
    // Generate TX ID
    const today = new Date();
    const dateStr = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    const txId = `TX-${dateStr}-${String(Date.now()).slice(-4)}`;

    const transaction = {
      id: txId,
      timestamp: new Date(),
      outletId: activeOutlet.id,
      outletName: activeOutlet.name,
      cashierName: currentUser?.name || 'Kasir',
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        hpp: item.product.purchasePrice,
        subtotal: item.product.sellingPrice * item.quantity,
        selectedVariant: item.selectedVariant,
        selectedModifiers: item.selectedModifiers,
      })),
      subtotal,
      taxRate: taxSettings.ppnEnabled ? taxSettings.ppnRate : 0,
      taxAmount,
      discount: totalDiscount,
      totalPaid: total,
      paymentMethod: selectedPayment,
      status: 'Sukses' as const,
      customerId: selectedCustomer?.id || undefined,
      customerName: selectedCustomer?.name || undefined,
      promoCode: activePromo?.code || undefined,
      memberDiscount,
      promoDiscount,
      pointsEarned,
      pointsRedeemed: pointsToRedeem || 0,
      pointsDiscount: pointsDiscount || 0,
    };

    addTransaction(transaction);

    // Save to lastTransaction for receipt printing mockup
    const cashRec = selectedPayment === 'Tunai' ? (parseInt(cashInput.replace(/\D/g, ''), 10) || total) : total;
    const changeAmount = selectedPayment === 'Tunai' ? (cashRec - total) : 0;

    setLastTransaction({
      ...transaction,
      cashReceived: cashRec,
      change: changeAmount >= 0 ? changeAmount : 0,
    });

    setPaymentSuccess(true);
    toast.success('Transaksi berhasil dicatat!');
  };

  const handleNewTransaction = () => {
    clearCart();
    setVoucherInput('');
    setCashInput('');
    setCheckoutOpen(false);
    setPaymentSuccess(false);
    setLastTransaction(null);
  };

  const cashChange = parseInt(cashInput.replace(/\D/g, ''), 10) - total;

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground font-medium">Memuat POS KasirKu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-7rem)] -m-4 lg:-m-6 overflow-hidden">

      {/* ═══════════════════════════════════════
          LEFT: Product Grid
      ═══════════════════════════════════════ */}
      <div className={cn("flex flex-col flex-1 min-w-0 p-4 lg:p-6 overflow-hidden", activePosTab === 'products' ? 'flex' : 'hidden lg:flex')}>
        {/* Search + scanner */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="product-search"
              placeholder="Cari nama produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border/60"
            />
          </div>
          <button
            id="btn-barcode-scanner"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-card border border-border/60 hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors shrink-0 cursor-pointer"
            title="Scan Barcode"
            onClick={() => toast.info('Scanner barcode simulasi aktif')}
          >
            <ScanLine size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              id={`cat-tab-${value.toLowerCase()}`}
              onClick={() => setActiveCategory(value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer',
                activeCategory === value
                  ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                  : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {CATEGORY_EMOJI[value] && <span className="mr-1.5">{CATEGORY_EMOJI[value]}</span>}
              {label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p>Produk tidak ditemukan di outlet ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => handleProductClick(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT: Cart Ledger
      ═══════════════════════════════════════ */}
      <div className={cn("w-full lg:w-96 shrink-0 flex flex-col border-l border-border/60 bg-card/50", activePosTab === 'cart' ? 'flex h-full' : 'hidden lg:flex')}>
        {/* Cart header */}
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Keranjang</h2>
            {cart.length > 0 && (
              <Badge className="badge-indigo border-0 text-xs px-2 py-0.5 animate-glow">
                {cart.reduce((s, i) => s + i.quantity, 0)} item
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentUser?.role === 'Cashier' && activeShift && (
              <button
                id="btn-close-shift"
                onClick={() => {
                  setShiftModalMode('close');
                  setShiftModalOpen(true);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Clock size={12} /> Tutup Shift
              </button>
            )}
            {pendingOrders.length > 0 && (
              <button
                id="btn-view-pending"
                onClick={() => setPendingOpen(true)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Clock size={12} /> Ditahan ({pendingOrders.length})
              </button>
            )}
            {cart.length > 0 && (
              <button
                id="btn-clear-cart"
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} /> Kosongkan
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/50">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Keranjang masih kosong</p>
              <p className="text-xs mt-1">Klik produk untuk menambahkan</p>
            </div>
          ) : (
            cart.map((item) => {
              const uniqueKey = `${item.product.id}-${item.selectedVariant?.id || 'no-var'}-${(item.selectedModifiers || []).map((m) => m.id).join('_')}`;
              return (
                <CartItemRow
                  key={uniqueKey}
                  item={item}
                  onIncrease={() => addToCart(item.product, item.selectedVariant, item.selectedModifiers)}
                  onDecrease={() => updateCartQuantity(item.product.id, item.quantity - 1, item.selectedVariant, item.selectedModifiers)}
                  onRemove={() => removeFromCart(item.product.id, item.selectedVariant, item.selectedModifiers)}
                  onEdit={() => {
                    const hasVariants = item.product.variants && item.product.variants.length > 0;
                    const hasModifiers = item.product.modifiers && item.product.modifiers.length > 0;
                    if (hasVariants || hasModifiers) {
                      setEditingCartItem(item);
                      setSelectedProductForCustomization(item.product);
                      setVariantModalOpen(true);
                    }
                  }}
                  onUpdateQty={(qty) => {
                    updateCartQuantity(item.product.id, qty, item.selectedVariant, item.selectedModifiers);
                  }}
                />
              );
            })
          )}
        </div>

        {/* Calculation section */}
        <div className="border-t border-border/40 p-4 space-y-3.5 bg-zinc-950/20">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Pelanggan / Member Keanggotaan</Label>
            <Select
              value={selectedCustomer?.id || 'none'}
              onValueChange={(val) => {
                if (val === 'none') {
                  setSelectedCustomer(null);
                } else {
                  const customer = customers.find((c) => c.id === val);
                  setSelectedCustomer(customer || null);
                  if (customer) {
                    toast.success(`Member "${customer.name}" terhubung (${customer.tier})`);
                  }
                }
              }}
            >
              <SelectTrigger className="w-full bg-background border-border/60 h-9 text-xs">
                <SelectValue placeholder="Pilih Pelanggan" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="none">Bukan Member (Umum)</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.tier} - {c.points} Poin)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Promo code selection */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Kupon / Promo Terjadwal</Label>
            <Select
              value={activePromo?.id || 'none'}
              onValueChange={(val) => {
                if (val === 'none') {
                  setActivePromo(null);
                } else {
                  const promo = promos.find((p) => p.id === val);
                  if (promo) {
                    if (subtotal < promo.minPurchase) {
                      toast.error(`Belum mencapai minimal belanja ${formatIDR(promo.minPurchase)}`);
                      return;
                    }
                    setActivePromo(promo);
                    toast.success(`Promo "${promo.code}" berhasil dipasang!`);
                  }
                }
              }}
            >
              <SelectTrigger className="w-full bg-background border-border/60 h-9 text-xs">
                <SelectValue placeholder="Pilih Promo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="none">Tanpa Kupon Promo</SelectItem>
                {promos
                  .filter((p) => p.isActive)
                  .map((p) => {
                    const isEligible = subtotal >= p.minPurchase;
                    return (
                      <SelectItem key={p.id} value={p.id} disabled={!isEligible}>
                        {p.code} - {p.name} {!isEligible && `(Min. ${formatIDR(p.minPurchase)})`}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>

          {/* Voucher input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                id="voucher-input"
                placeholder="Diskon manual (Rp)"
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
                className="pl-9 h-9 text-xs bg-background border-border/60"
              />
            </div>
            <button
              id="btn-apply-voucher"
              onClick={handleApplyVoucher}
              className="px-3 h-9 text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              Pasang
            </button>
          </div>

          {/* Calculations Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal Penjualan</span>
              <span className="font-medium text-foreground">{formatIDR(subtotal)}</span>
            </div>
            {memberDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Diskon Member ({selectedCustomer?.tier})</span>
                <span>- {formatIDR(memberDiscount)}</span>
              </div>
            )}
            {promoDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Diskon Promo ({activePromo?.code})</span>
                <span>- {formatIDR(promoDiscount)}</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Diskon Voucher Manual</span>
                <span>- {formatIDR(voucherDiscount)}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Tukar Poin Member</span>
                <span>- {formatIDR(pointsDiscount)}</span>
              </div>
            )}
            {taxSettings.ppnEnabled && (
              <div className="flex justify-between text-muted-foreground">
                <span>PPN ({(taxSettings.ppnRate * 100).toFixed(0)}%)</span>
                <span>{formatIDR(taxAmount)}</span>
              </div>
            )}

            <div className="h-px bg-border/30 my-2" />

            <div className="flex justify-between font-bold text-sm">
              <span>Total Pembayaran</span>
              <span className="text-primary text-base font-extrabold">{formatIDR(Math.max(0, total))}</span>
            </div>

            {selectedCustomer && (
              <div className="flex justify-between text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2">
                <span>Poin Loyalitas diperoleh:</span>
                <span className="font-bold">+{pointsEarned} Poin</span>
              </div>
            )}
          </div>

          {/* Checkout buttons */}
          <div className="flex gap-2">
            {cart.length > 0 && (
              <Button
                variant="outline"
                onClick={handleOpenSavePending}
                className="flex-1 py-3 border-border/60 text-xs font-semibold cursor-pointer h-auto rounded-xl flex items-center justify-center gap-1.5"
              >
                <Clock size={14} /> Tahan
              </Button>
            )}
            <button
              id="btn-checkout"
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={cn(
                "py-3 rounded-xl bg-success hover:bg-success/90 text-white font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed glow-emerald shadow-lg flex items-center justify-center gap-2 cursor-pointer",
                cart.length > 0 ? "flex-[2]" : "w-full"
              )}
            >
              <CreditCard size={16} />
              Bayar / Konfirmasi Struk
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="lg:hidden shrink-0 border-t border-border/40 bg-zinc-950/45 p-2 flex gap-2">
        <button
          onClick={() => setActivePosTab('products')}
          className={cn(
            "flex-1 py-2.5 text-center rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
            activePosTab === 'products'
              ? "bg-primary text-white shadow-lg glow-primary"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground"
          )}
        >
          🛍️ Produk ({filteredProducts.length})
        </button>
        <button
          onClick={() => setActivePosTab('cart')}
          className={cn(
            "flex-1 py-2.5 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activePosTab === 'cart'
              ? "bg-primary text-white shadow-lg glow-primary"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground"
          )}
        >
          🛒 Keranjang ({cart.reduce((s, i) => s + i.quantity, 0)})
          {cart.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-mono">
              {formatIDR(total)}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════
          CHECKOUT DIALOG
      ═══════════════════════════════════════ */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => {
        if (!open) {
          if (paymentSuccess) {
            handleNewTransaction();
          } else {
            setCheckoutOpen(false);
          }
        } else {
          setCheckoutOpen(true);
        }
      }}>
        <DialogContent className="max-w-md bg-card border-border/60 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {paymentSuccess ? '✅ Transaksi Berhasil' : 'Konfirmasi Pembayaran'}
            </DialogTitle>
          </DialogHeader>

          {paymentSuccess && lastTransaction ? (
            <div className="space-y-4">
              {/* Thermal receipt preview paper container */}
              <div className="bg-white border border-zinc-200 shadow-md p-5 rounded-lg text-zinc-900 font-mono text-[11px] leading-normal w-[310px] mx-auto">
                <div className="text-center font-bold text-xs uppercase mb-0.5 tracking-wider whitespace-pre-line">
                  {businessProfile.receiptHeader || '*** KASIRKU POS ***'}
                </div>
                <div className="text-center font-bold text-xs uppercase mb-0.5">
                  {lastTransaction.outletName}
                </div>
                <div className="text-center text-[10px] text-zinc-500 mb-3">
                  {activeOutlet.address}<br />
                  Telp: {activeOutlet.phone || '—'}
                </div>

                <div className="border-t border-dashed border-zinc-300 my-2" />

                <div className="space-y-0.5 text-[10px] text-zinc-600 mb-2">
                  <div className="flex justify-between"><span>No. Struk:</span><span>{lastTransaction.id}</span></div>
                  <div className="flex justify-between"><span>Tanggal:</span><span>{new Date(lastTransaction.timestamp).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Kasir:</span><span>{lastTransaction.cashierName}</span></div>
                  {lastTransaction.customerName && (
                    <div className="flex justify-between"><span>Pelanggan:</span><span>{lastTransaction.customerName}</span></div>
                  )}
                </div>

                <div className="border-t border-dashed border-zinc-300 my-2" />

                <div className="space-y-2 mb-2 text-zinc-800">
                  {lastTransaction.items.map((item: any, idx: number) => (
                    <div key={idx} className="text-[11px]">
                      <div className="font-semibold text-zinc-900">{item.productName}</div>
                      {item.selectedVariant && (
                        <div className="text-[9px] text-zinc-500 pl-2">- Varian: {item.selectedVariant.name}</div>
                      )}
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div className="text-[9px] text-zinc-500 pl-2">
                          - Mod: {item.selectedModifiers.map((m: any) => m.name).join(', ')}
                        </div>
                      )}
                      <div className="flex justify-between text-zinc-600 pl-2">
                        <span>{item.quantity} x {formatIDR(item.unitPrice)}</span>
                        <span>{formatIDR(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-zinc-300 my-2" />

                <div className="space-y-1 text-[10px] text-zinc-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatIDR(lastTransaction.subtotal)}</span>
                  </div>
                  {lastTransaction.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Diskon</span>
                      <span>-{formatIDR(lastTransaction.discount)}</span>
                    </div>
                  )}
                  {lastTransaction.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>PPN ({(lastTransaction.taxRate * 100).toFixed(0)}%)</span>
                      <span>{formatIDR(lastTransaction.taxAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-dotted border-zinc-300 my-1.5" />
                  <div className="flex justify-between font-bold text-zinc-900 text-xs">
                    <span>TOTAL</span>
                    <span>{formatIDR(lastTransaction.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metode</span>
                    <span>{lastTransaction.paymentMethod}</span>
                  </div>
                  {lastTransaction.paymentMethod === 'Tunai' && (
                    <>
                      <div className="flex justify-between">
                        <span>Tunai Diterima</span>
                        <span>{formatIDR(lastTransaction.cashReceived)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-600">
                        <span>Kembalian</span>
                        <span>{formatIDR(lastTransaction.change)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-dashed border-zinc-300 my-2.5" />

                <div className="text-center text-[10px] text-zinc-500 mt-2 whitespace-pre-line">
                  {businessProfile.receiptFooter || 'Terima Kasih Atas Kunjungan Anda\nKasirKu POS System'}
                </div>
              </div>

              {/* Action buttons inside Dialog */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  id="btn-print-receipt-dialog"
                  onClick={() => {
                    if (!lastTransaction) return;
                    printThermalReceipt(lastTransaction, {
                      outletAddress: activeOutlet.address,
                      outletPhone: activeOutlet.phone,
                      receiptHeader: businessProfile.receiptHeader || '★ KASIRKU POS ★',
                      receiptFooter: businessProfile.receiptFooter,
                      paperWidth: '80mm',
                    });
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold gap-2 py-2.5 cursor-pointer shadow-lg glow-primary"
                >
                  <Printer size={15} /> Cetak Struk (58mm / 80mm)
                </Button>
                <Button
                  id="btn-send-digital-receipt"
                  variant="outline"
                  onClick={() => {
                    setReceiptPhone(lastTransaction?.customerPhone || '');
                    setReceiptEmail(lastTransaction?.customerEmail || '');
                    setSendReceiptOpen(true);
                  }}
                  className="w-full border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 font-semibold cursor-pointer gap-2"
                >
                  <Send size={14} /> Kirim Struk Digital
                </Button>
                <Button
                  id="btn-new-transaction"
                  variant="outline"
                  onClick={handleNewTransaction}
                  className="w-full border-border/60 hover:bg-zinc-800 text-foreground font-semibold cursor-pointer"
                >
                  Transaksi Baru
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Total */}
              <div className="p-4 rounded-xl bg-background/60 border border-border/40 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
                <p className="text-3xl font-extrabold text-primary">{formatIDR(Math.max(0, total))}</p>
              </div>

              {/* Loyalty Points Redemption (Tukar Poin) */}
              {selectedCustomer && selectedCustomer.points > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-400">Poin Loyalitas Member</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Tersedia: <span className="font-bold text-foreground">{selectedCustomer.points} Poin</span> (Rp {selectedCustomer.points * 100})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="use-points-switch"
                        type="checkbox"
                        checked={pointsToRedeem > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPointsToRedeem(maxAllowedToRedeem);
                          } else {
                            setPointsToRedeem(0);
                          }
                        }}
                        className="w-4 h-4 text-primary bg-background border-border/60 rounded cursor-pointer"
                      />
                      <label htmlFor="use-points-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                        Gunakan Poin
                      </label>
                    </div>
                  </div>

                  {pointsToRedeem > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-indigo-500/20">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="points-input" className="text-[11px] text-muted-foreground font-semibold">
                          Jumlah Poin Ditukar:
                        </label>
                        <div className="flex items-center gap-1.5 max-w-[120px]">
                          <Input
                            id="points-input"
                            type="number"
                            min={1}
                            max={maxAllowedToRedeem}
                            value={pointsToRedeem}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              setPointsToRedeem(Math.max(0, Math.min(maxAllowedToRedeem, val)));
                            }}
                            className="h-8 text-center text-xs font-bold bg-background border-border/60 p-1"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Potongan Belanja:</span>
                        <span className="font-bold text-success">- {formatIDR(pointsToRedeem * 100)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment method */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Metode Pembayaran</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      id={`payment-method-${value.toLowerCase().replace('/', '-')}`}
                      onClick={() => setSelectedPayment(value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-xs font-medium cursor-pointer',
                        selectedPayment === value
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border/60 bg-background/40 text-muted-foreground hover:border-border'
                      )}
                    >
                      <Icon size={20} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QRIS Section */}
              {selectedPayment === 'QRIS' && (
                <div className="space-y-3">
                  {/* ⚠️ Simulation Warning Banner */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-amber-500 text-[11px] font-black">!</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-400">Mode Simulasi — QR Belum Terdaftar</p>
                      <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                        QR code ini bukan QRIS resmi. Untuk menerima pembayaran QRIS sungguhan, daftarkan merchant Anda ke <span className="font-semibold">Midtrans, Xendit,</span> atau bank penerbit QRIS.
                      </p>
                    </div>
                  </div>

                  {/* QR Code Demo (grayed + watermark) */}
                  <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 relative overflow-hidden">
                    {/* DEMO diagonal watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-15">
                      <span className="text-slate-800 font-black text-5xl rotate-[-35deg] tracking-widest">DEMO</span>
                    </div>

                    <div className="relative">
                      {/* QRIS Header */}
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded bg-slate-400 flex items-center justify-center">
                          <QrCode size={14} className="text-white" />
                        </div>
                        <span className="text-[11px] font-black text-slate-500 tracking-widest uppercase">QRIS Simulasi</span>
                      </div>
                      {/* QR Code Container */}
                      <div className="w-44 h-44 border-4 border-slate-200 rounded-2xl flex items-center justify-center bg-white shadow overflow-hidden relative grayscale opacity-70">
                        {qrisLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 size={28} className="animate-spin text-slate-400" />
                            <p className="text-[10px] text-slate-400">Membuat QR demo...</p>
                          </div>
                        ) : qrisUrl ? (
                          <img
                            src={qrisUrl}
                            alt="QRIS Demo Code"
                            className="w-full h-full object-contain"
                            onError={() => setQrisLoading(false)}
                          />
                        ) : null}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-3 font-semibold tracking-wide">DEMO — TIDAK DAPAT DISCAN</p>
                    <p className="text-base font-black text-slate-500 mt-0.5">{formatIDR(Math.max(0, total))}</p>
                  </div>

                  {/* Guide: How to get real QRIS */}
                  <div className="p-3 rounded-xl bg-card border border-border/40">
                    <p className="text-[11px] font-bold text-foreground mb-2">💡 Cara mendapatkan QRIS terdaftar:</p>
                    <div className="space-y-1.5">
                      {[
                        { name: 'Midtrans', desc: 'dashboard.midtrans.com → QRIS Merchant' },
                        { name: 'Xendit', desc: 'dashboard.xendit.co → QR Code' },
                        { name: 'Bank (BCA/BNI/Mandiri)', desc: 'Daftar QRIS langsung di aplikasi bisnis bank' },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{item.name}</span> — {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fallback action: confirm manually */}
                  <p className="text-[11px] text-center text-muted-foreground italic">
                    Setelah pelanggan scan QRIS merchant Anda dan membayar, klik konfirmasi di bawah.
                  </p>
                </div>
              )}

              {/* Cash change calculator */}
              {selectedPayment === 'Tunai' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Uang Diterima</label>
                  <Input
                    id="cash-received"
                    placeholder="Masukkan nominal uang..."
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="bg-background border-border/60"
                  />
                  {cashChange >= 0 && cashInput && (
                    <div className="flex justify-between px-3 py-2 rounded-lg bg-success/10 border border-success/20 text-sm">
                      <span className="text-muted-foreground">Kembalian</span>
                      <span className="font-bold text-success">{formatIDR(cashChange)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm button */}
              <button
                id="btn-confirm-payment"
                onClick={handleConfirmPayment}
                className="w-full py-3.5 rounded-xl bg-success hover:bg-success/90 text-white font-bold transition-all glow-emerald cursor-pointer"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Digital Receipt Modal */}
      <Dialog open={sendReceiptOpen} onOpenChange={setSendReceiptOpen}>
        <DialogContent className="max-w-sm bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send size={16} className="text-emerald-400" />
              Kirim Struk Digital
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Kirim struk #{lastTransaction?.id} ke pelanggan melalui:</p>
            {/* WhatsApp */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MessageCircle size={13} className="text-green-500" /> Nomor WhatsApp
              </label>
              <div className="flex gap-2">
                <input
                  id="receipt-whatsapp-phone"
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={receiptPhone}
                  onChange={(e) => setReceiptPhone(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm rounded-md bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green-500/50"
                />
                <button
                  id="btn-send-whatsapp"
                  onClick={handleSendWhatsApp}
                  disabled={sendingReceipt}
                  className="px-3 h-9 rounded-md bg-green-600 hover:bg-green-500 text-white text-xs font-bold gap-1.5 flex items-center transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sendingReceipt ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
                  Kirim WA
                </button>
              </div>
            </div>
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail size={13} className="text-blue-400" /> Alamat Email
              </label>
              <div className="flex gap-2">
                <input
                  id="receipt-email"
                  type="email"
                  placeholder="pelanggan@email.com"
                  value={receiptEmail}
                  onChange={(e) => setReceiptEmail(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm rounded-md bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
                <button
                  id="btn-send-email"
                  onClick={handleSendEmail}
                  disabled={sendingReceipt}
                  className="px-3 h-9 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 flex items-center transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sendingReceipt ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                  Kirim Email
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/60 text-center">WhatsApp akan membuka aplikasi. Email menggunakan klien email default.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift and Variant Modals */}
      <ShiftModal
        isOpen={shiftModalOpen}
        onOpenChange={setShiftModalOpen}
        mode={shiftModalMode}
      />
      <VariantModal
        isOpen={variantModalOpen}
        onOpenChange={(open) => {
          setVariantModalOpen(open);
          if (!open) {
            setSelectedProductForCustomization(null);
            setEditingCartItem(null);
          }
        }}
        product={selectedProductForCustomization}
        onConfirm={handleConfirmCustomization}
        initialVariant={editingCartItem?.selectedVariant}
        initialModifiers={editingCartItem?.selectedModifiers}
      />

      {/* ── Dialog Tahan Tagihan (Save Pending Note) ── */}
      <Dialog open={savePendingOpen} onOpenChange={setSavePendingOpen}>
        <DialogContent className="max-w-sm bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-500">
              <Clock size={16} /> Tahan Pembayaran
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="pending-note-input" className="text-xs font-semibold text-muted-foreground">Catatan / Nama Meja / Nama Pelanggan</label>
              <Input
                id="pending-note-input"
                placeholder="Contoh: Meja 5, Pelanggan Budi..."
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                className="bg-background border-border/60 text-xs"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSavePendingOpen(false)}
                className="border-border/60 text-xs"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmSavePending}
                disabled={!pendingNote.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              >
                Simpan & Tahan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog List Pending Orders (Daftar Tagihan Ditahan) ── */}
      <Dialog open={pendingOpen} onOpenChange={setPendingOpen}>
        <DialogContent className="max-w-lg bg-card border-border/60 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-500">
              <Clock size={16} /> Daftar Tagihan Ditahan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {pendingOrders.length === 0 ? (
              <p className="text-center py-6 text-xs text-muted-foreground">Tidak ada tagihan yang sedang ditahan.</p>
            ) : (
              <div className="space-y-2.5">
                {pendingOrders.map((order) => {
                  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0);
                  const orderTotal = order.items.reduce((sum, item) => {
                    return sum + (item.product.sellingPrice * item.quantity);
                  }, 0);
                  let discountVal = 0;
                  if (order.customer) {
                    let memberDiscountPercent = 0;
                    if (order.customer.tier === 'Gold') memberDiscountPercent = 0.1;
                    else if (order.customer.tier === 'Silver') memberDiscountPercent = 0.05;
                    else if (order.customer.tier === 'Bronze') memberDiscountPercent = 0.02;
                    discountVal = orderTotal * memberDiscountPercent;
                  }
                  if (order.activePromo && orderTotal >= order.activePromo.minPurchase && order.activePromo.isActive) {
                    if (order.activePromo.type === 'Percentage') {
                      discountVal += orderTotal * (order.activePromo.value / 100);
                    } else {
                      discountVal += order.activePromo.value;
                    }
                  }
                  discountVal += order.voucherDiscount + (order.pointsToRedeem * 100);
                  const subWithDisc = Math.max(0, orderTotal - discountVal);
                  const taxVal = taxSettings.ppnEnabled ? subWithDisc * taxSettings.ppnRate : 0;
                  const finalTotal = subWithDisc + taxVal;

                  return (
                    <div key={order.id} className="p-3 rounded-lg border border-border/40 bg-zinc-950/40 flex justify-between items-center gap-4 hover:border-amber-500/30 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">{order.note}</span>
                          <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/5 px-1 py-0">{itemsCount} item</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {order.customer ? `Member: ${order.customer.name}` : 'Umum'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-foreground">{formatIDR(finalTotal)}</span>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadPending(order.id)}
                            className="border-border/60 hover:bg-amber-500/10 hover:text-amber-400 text-[10px] h-8 px-2.5 cursor-pointer font-medium"
                          >
                            Buka
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              deletePendingOrder(order.id);
                              toast.success('Tagihan ditahan berhasil dihapus');
                            }}
                            className="text-destructive hover:bg-destructive/10 text-[10px] h-8 px-2.5 cursor-pointer font-medium"
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── Product Card ──────────────────────────────
function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= product.minStock;

  return (
    <button
      id={`product-card-${product.id}`}
      onClick={onAdd}
      disabled={isOutOfStock}
      className={cn(
        'group relative text-left p-4 rounded-xl border transition-all duration-200 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5',
        isOutOfStock
          ? 'opacity-50 cursor-not-allowed border-border/40'
          : 'border-border/60 cursor-pointer'
      )}
    >
      {/* Product image thumbnail */}
      <div className="w-full aspect-square rounded-lg bg-secondary/50 overflow-hidden flex items-center justify-center text-3xl mb-3 group-hover:scale-105 transition-transform duration-200 border border-border/20">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          CATEGORY_EMOJI[product.category] || '📦'
        )}
      </div>

      {/* Stock badge */}
      <div className="absolute top-3 right-3">
        {isOutOfStock ? (
          <Badge className="badge-danger border-0 text-[10px] px-1.5 py-0.5">Habis</Badge>
        ) : isLowStock ? (
          <Badge className="badge-warning border-0 text-[10px] px-1.5 py-0.5 flash-danger">Menipis</Badge>
        ) : null}
      </div>

      <p className="font-semibold text-sm text-foreground leading-tight line-clamp-2 mb-1">
        {product.name}
      </p>
      <p className="text-xs text-muted-foreground mb-2 font-mono">{product.sku}</p>
      <p className="text-xs text-muted-foreground mb-2">Stok: {product.stock}</p>
      <p className="font-bold text-primary">{formatIDR(product.sellingPrice)}</p>

      {/* Add indicator */}
      {!isOutOfStock && (
        <div className="absolute bottom-3 right-3 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus size={12} className="text-primary" />
        </div>
      )}
    </button>
  );
}

// ── Cart Item Row ─────────────────────────────
function CartItemRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  onEdit,
  onUpdateQty,
}: {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  const hasCustomization = (item.product.variants && item.product.variants.length > 0) || 
                           (item.product.modifiers && item.product.modifiers.length > 0);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/40 group">
      <div className="w-8 h-8 rounded-lg bg-secondary/50 overflow-hidden flex items-center justify-center text-lg shrink-0 border border-border/20">
        {item.product.imageUrl ? (
          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
        ) : (
          CATEGORY_EMOJI[item.product.category] || '📦'
        )}
      </div>
      <div 
        onClick={onEdit}
        className={cn(
          "flex-1 min-w-0",
          hasCustomization ? "cursor-pointer hover:opacity-85" : ""
        )}
        title={hasCustomization ? "Klik untuk ubah variasi/modifikator" : undefined}
      >
        <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
        
        {/* Render Selected Variant */}
        {item.selectedVariant && (
          <p className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
            Varian: <span className="text-foreground">{item.selectedVariant.name}</span>
          </p>
        )}
        
        {/* Render Selected Modifiers */}
        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
          <p className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5 truncate">
            Mod: <span className="text-foreground">{item.selectedModifiers.map(m => m.name).join(', ')}</span>
          </p>
        )}

        <p className="text-xs text-primary font-semibold mt-1">
          {formatIDR(item.product.sellingPrice)}
          {item.product.unit && item.product.unit !== 'pcs' && (
            <span className="text-[10px] text-muted-foreground font-normal"> / {item.product.unit}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {item.product.unit === 'kg' || item.product.unit === 'gr' ? (
          <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={item.quantity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onUpdateQty(val);
                }
              }}
              className="w-16 h-7 text-xs text-center bg-background border border-border/40 rounded p-1 font-bold text-foreground focus:outline-none focus:border-primary"
            />
            <span className="text-[10px] font-semibold text-muted-foreground pr-1">{item.product.unit}</span>
          </div>
        ) : (
          <>
            <button
              onClick={onDecrease}
              className="w-6 h-6 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Minus size={12} />
            </button>
            <span className="w-7 text-center text-sm font-bold text-foreground">{item.quantity}</span>
            <button
              onClick={onIncrease}
              className="w-6 h-6 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </>
        )}
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-md ml-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
