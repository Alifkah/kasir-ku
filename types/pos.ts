// ─────────────────────────────────────────────
// KasirKu — Core Domain Type Definitions
// ─────────────────────────────────────────────

export type ProductCategory = 'Makanan' | 'Minuman' | 'Ritel' | 'Semua';

export type PaymentMethod = 'Tunai' | 'Debit/Kredit' | 'QRIS';

export type TransactionStatus = 'Sukses' | 'Pending' | 'Gagal' | 'Diretur';

export type StockStatus = 'Aman' | 'Menipis' | 'Habis';

export type ExpenseCategory =
  | 'Tagihan Listrik'
  | 'Pembelian Supplier PO'
  | 'Gaji Karyawan'
  | 'Sewa Tempat'
  | 'Perawatan Peralatan'
  | 'Transportasi'
  | 'Lain-lain';

// ─────────────────────────────────────────────
// Outlet / Tenant
// ─────────────────────────────────────────────
export interface Outlet {
  id: string;
  name: string;
  address: string;
  staffCount: number;
  isActive: boolean;
  phone: string;
  manager: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  priceDifference: number; // Harga Tambahan (selisih)
}

export interface ProductModifier {
  id: string;
  name: string;
  price: number;
}

// ─────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  purchasePrice: number;   // Harga Beli / HPP
  sellingPrice: number;    // Harga Jual
  stock: number;           // Sisa Stok
  minStock: number;        // Minimum Stok (threshold)
  outletId: string;
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
  modifiers?: ProductModifier[];
  unit?: string;
  purchaseUnit?: string;
  conversionRate?: number;
}

// ─────────────────────────────────────────────
// Cart
// ─────────────────────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedModifiers?: ProductModifier[];
}

// ─────────────────────────────────────────────
// Transaction
// ─────────────────────────────────────────────
export interface TransactionItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;       // Harga Jual saat transaksi
  hpp: number;             // HPP saat transaksi
  subtotal: number;
  selectedVariant?: ProductVariant;
  selectedModifiers?: ProductModifier[];
  refundedQty?: number;    // Jumlah item yang diretur
}

export interface Transaction {
  id: string;              // e.g. TX-2026-0526-001
  timestamp: Date;
  outletId: string;
  outletName: string;
  cashierName: string;
  items: TransactionItem[];
  subtotal: number;
  taxRate: number;         // e.g. 0.11 for PPN 11%
  taxAmount: number;
  discount: number;
  totalPaid: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string;
  customerId?: string;
  customerName?: string;
  promoCode?: string;
  memberDiscount?: number;
  promoDiscount?: number;
  pointsEarned?: number;
  refundedAmount?: number; // Total nominal yang di-refund
}

// ─────────────────────────────────────────────
// Expense
// ─────────────────────────────────────────────
export interface Expense {
  id: string;              // e.g. EXP-2026-001
  date: Date;
  category: ExpenseCategory;
  description: string;
  amount: number;
  outletId: string;
  hasReceipt: boolean;
  createdBy: string;
  receiptUrl?: string;
}

// ─────────────────────────────────────────────
// Report / Analytics
// ─────────────────────────────────────────────
export interface WeeklySalesData {
  day: string;
  currentWeek: number;
  previousWeek: number;
}

// ─────────────────────────────────────────────
// Payment Method Share
// ─────────────────────────────────────────────
export interface PaymentMethodShare {
  name: PaymentMethod;
  value: number;
  color: string;
}

// ─────────────────────────────────────────────
// Top Product
// ─────────────────────────────────────────────
export interface TopProduct {
  rank: number;
  productId: string;
  productName: string;
  category: ProductCategory;
  quantitySold: number;
  grossRevenue: number;
  grossProfit: number;
}

export interface ShiftSession {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: Date;
  endTime?: Date;
  initialCash: number;     // Modal Awal
  expectedCash: number;    // Ekspektasi Laci Kas
  actualCash?: number;     // Uang Fisik Laci
  difference?: number;     // Selisih Kas
  notes?: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────
export interface TaxSettings {
  ppnEnabled: boolean;
  ppnRate: number;           // e.g. 0.11
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;             // NPWP
  logoUrl?: string;
  receiptHeader?: string;
  receiptFooter?: string;
}

// ─────────────────────────────────────────────
// Customer / Member
// ─────────────────────────────────────────────
export type MemberTier = 'Regular' | 'Bronze' | 'Silver' | 'Gold';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  joinedDate: Date;
  tier: MemberTier;
  totalSpent: number;
}

// ─────────────────────────────────────────────
// Diskon & Promo
// ─────────────────────────────────────────────
export type PromoType = 'Percentage' | 'Fixed';

export interface Promo {
  id: string;
  code: string;
  name: string;
  type: PromoType;
  value: number;
  minPurchase: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// ─────────────────────────────────────────────
// User / Auth
// ─────────────────────────────────────────────
export type UserRole = 'Owner' | 'Cashier';

export type PermissionKey =
  | 'view_reports'
  | 'manage_inventory'
  | 'process_refunds'
  | 'manage_promos'
  | 'manage_expenses'
  | 'manage_suppliers_po'
  | 'manage_settings'
  | 'manage_staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  outletId?: string;
  permissions?: PermissionKey[];
  password?: string;
  phone?: string;
  isActive?: boolean;
}

// ─────────────────────────────────────────────
// Supplier & PO (Purchase Orders)
// ─────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number;       // Harga Beli / HPP PO
  subtotal: number;
  purchaseUnit?: string;
  conversionRate?: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'Draft' | 'Dipesan' | 'Diterima' | 'Dibatalkan';
  dateCreated: Date;
  dateReceived?: Date;
  outletId: string;
}

// ─────────────────────────────────────────────
// Stock Ledger (Kartu Stok)
// ─────────────────────────────────────────────
export type StockChangeType = 'Penjualan' | 'Penerimaan PO' | 'Retur Penjualan' | 'Penyesuaian Manual';

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  timestamp: Date;
  changeType: StockChangeType;
  quantityChange: number; // e.g. -5 atau +10
  stockAfter: number;
  referenceId?: string;    // ID transaksi, PO, dll
  notes?: string;
  createdBy: string;
  outletId: string;
}


