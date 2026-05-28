import {
  Product,
  Outlet,
  Transaction,
  Expense,
  WeeklySalesData,
  PaymentMethodShare,
  TopProduct,
  ShiftSession,
  BusinessProfile,
  TaxSettings,
  Customer,
  Promo,
  User,
  Supplier,
  PurchaseOrder,
} from '@/types/pos';

// ─────────────────────────────────────────────
// Outlets
// ─────────────────────────────────────────────
export const mockOutlets: Outlet[] = [
  {
    id: 'outlet-001',
    name: 'Outlet Cabang M. Yamin',
    address: 'Jl. M. Yamin No. 45, Samarinda, Kalimantan Timur 75117',
    staffCount: 5,
    isActive: true,
    phone: '+62 541 742 100',
    manager: 'Budi Santoso',
  },
  {
    id: 'outlet-002',
    name: 'Outlet Cabang Kartini',
    address: 'Jl. R.A. Kartini No. 12, Samarinda, Kalimantan Timur 75124',
    staffCount: 4,
    isActive: true,
    phone: '+62 541 743 200',
    manager: 'Siti Rahayu',
  },
];

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────
export const mockProducts: Product[] = [
  // Makanan
  {
    id: 'prod-001',
    name: 'Nasi Goreng Spesial',
    sku: 'MKN-NGS-001',
    category: 'Makanan',
    purchasePrice: 12000,
    sellingPrice: 22000,
    stock: 45,
    minStock: 10,
    outletId: 'outlet-001',
    description: 'Nasi goreng dengan telur dan ayam cincang',
    variants: [
      { id: 'v-ng-1', name: 'Regular', priceDifference: 0 },
      { id: 'v-ng-2', name: 'Jumbo', priceDifference: 6000 }
    ],
    modifiers: [
      { id: 'm-ng-1', name: 'Ekstra Telur', price: 4000 },
      { id: 'm-ng-2', name: 'Ekstra Ayam Suwir', price: 6000 }
    ]
  },
  {
    id: 'prod-002',
    name: 'Mie Ayam Bakso',
    sku: 'MKN-MAB-002',
    category: 'Makanan',
    purchasePrice: 10000,
    sellingPrice: 18000,
    stock: 30,
    minStock: 8,
    outletId: 'outlet-001',
    description: 'Mie kuning dengan ayam dan bakso sapi',
    variants: [
      { id: 'v-ma-1', name: 'Biasa', priceDifference: 0 },
      { id: 'v-ma-2', name: 'Spesial', priceDifference: 5000 }
    ],
    modifiers: [
      { id: 'm-ma-1', name: 'Ekstra Ceker', price: 3000 },
      { id: 'm-ma-2', name: 'Ekstra Bakso Sapi', price: 5000 }
    ]
  },
  {
    id: 'prod-003',
    name: 'Ayam Geprek Sambal Bawang',
    sku: 'MKN-AGB-003',
    category: 'Makanan',
    purchasePrice: 15000,
    sellingPrice: 25000,
    stock: 3,
    minStock: 5,
    outletId: 'outlet-001',
    description: 'Ayam crispy geprek sambal bawang pedas',
  },
  {
    id: 'prod-004',
    name: 'Gado-gado Lontong',
    sku: 'MKN-GGL-004',
    category: 'Makanan',
    purchasePrice: 8000,
    sellingPrice: 15000,
    stock: 20,
    minStock: 5,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-005',
    name: 'Soto Ayam Lamongan',
    sku: 'MKN-SAL-005',
    category: 'Makanan',
    purchasePrice: 11000,
    sellingPrice: 20000,
    stock: 25,
    minStock: 5,
    outletId: 'outlet-001',
  },
  // Minuman
  {
    id: 'prod-006',
    name: 'Es Teh Manis',
    sku: 'MNM-ETM-001',
    category: 'Minuman',
    purchasePrice: 2000,
    sellingPrice: 5000,
    stock: 80,
    minStock: 20,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-007',
    name: 'Jus Alpukat',
    sku: 'MNM-JAL-002',
    category: 'Minuman',
    purchasePrice: 8000,
    sellingPrice: 18000,
    stock: 15,
    minStock: 10,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-008',
    name: 'Kopi Susu Kekinian',
    sku: 'MNM-KSK-003',
    category: 'Minuman',
    purchasePrice: 9000,
    sellingPrice: 22000,
    stock: 40,
    minStock: 10,
    outletId: 'outlet-001',
    description: 'Kopi susu gula aren premium',
    variants: [
      { id: 'v-ks-1', name: 'Medium', priceDifference: 0 },
      { id: 'v-ks-2', name: 'Large', priceDifference: 5000 }
    ],
    modifiers: [
      { id: 'm-ks-1', name: 'Ekstra Shot Espresso', price: 4000 },
      { id: 'm-ks-2', name: 'Caramel Syrup', price: 3000 },
      { id: 'm-ks-3', name: 'Boba', price: 3000 }
    ]
  },
  {
    id: 'prod-009',
    name: 'Air Mineral 600ml',
    sku: 'MNM-AMN-004',
    category: 'Minuman',
    purchasePrice: 3000,
    sellingPrice: 5000,
    stock: 100,
    minStock: 30,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-010',
    name: 'Es Kelapa Muda',
    sku: 'MNM-EKM-005',
    category: 'Minuman',
    purchasePrice: 7000,
    sellingPrice: 15000,
    stock: 2,
    minStock: 5,
    outletId: 'outlet-001',
  },
  // Ritel
  {
    id: 'prod-011',
    name: 'Sabun Mandi Lifebuoy 80gr',
    sku: 'RTL-SML-001',
    category: 'Ritel',
    purchasePrice: 4500,
    sellingPrice: 7000,
    stock: 50,
    minStock: 10,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-012',
    name: 'Indomie Goreng Original',
    sku: 'RTL-IGO-002',
    category: 'Ritel',
    purchasePrice: 2500,
    sellingPrice: 4000,
    stock: 120,
    minStock: 24,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-013',
    name: 'Kecap Manis ABC 275ml',
    sku: 'RTL-KMA-003',
    category: 'Ritel',
    purchasePrice: 12000,
    sellingPrice: 16000,
    stock: 4,
    minStock: 6,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-014',
    name: 'Minyak Goreng Bimoli 2L',
    sku: 'RTL-MGB-004',
    category: 'Ritel',
    purchasePrice: 28000,
    sellingPrice: 35000,
    stock: 18,
    minStock: 5,
    outletId: 'outlet-001',
  },
  {
    id: 'prod-015',
    name: 'Gula Pasir Gulaku 1kg',
    sku: 'RTL-GPG-005',
    category: 'Ritel',
    purchasePrice: 14000,
    sellingPrice: 18000,
    stock: 22,
    minStock: 5,
    outletId: 'outlet-001',
  },
];

// ─────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────
export const mockTransactions: Transaction[] = [
  {
    id: 'TX-2026-0526-001',
    timestamp: new Date('2026-05-26T09:15:00'),
    outletId: 'outlet-001',
    outletName: 'Outlet Cabang M. Yamin',
    cashierName: 'Andi',
    items: [
      {
        productId: 'prod-001',
        productName: 'Nasi Goreng Spesial',
        sku: 'MKN-NGS-001',
        quantity: 2,
        unitPrice: 22000,
        hpp: 12000,
        subtotal: 44000,
      },
      {
        productId: 'prod-006',
        productName: 'Es Teh Manis',
        sku: 'MNM-ETM-001',
        quantity: 2,
        unitPrice: 5000,
        hpp: 2000,
        subtotal: 10000,
      },
    ],
    subtotal: 54000,
    taxRate: 0.11,
    taxAmount: 5940,
    discount: 0,
    totalPaid: 59940,
    paymentMethod: 'QRIS',
    status: 'Sukses',
  },
  {
    id: 'TX-2026-0526-002',
    timestamp: new Date('2026-05-26T10:30:00'),
    outletId: 'outlet-001',
    outletName: 'Outlet Cabang M. Yamin',
    cashierName: 'Andi',
    items: [
      {
        productId: 'prod-008',
        productName: 'Kopi Susu Kekinian',
        sku: 'MNM-KSK-003',
        quantity: 3,
        unitPrice: 22000,
        hpp: 9000,
        subtotal: 66000,
      },
      {
        productId: 'prod-012',
        productName: 'Indomie Goreng Original',
        sku: 'RTL-IGO-002',
        quantity: 5,
        unitPrice: 4000,
        hpp: 2500,
        subtotal: 20000,
      },
    ],
    subtotal: 86000,
    taxRate: 0.11,
    taxAmount: 9460,
    discount: 5000,
    totalPaid: 90460,
    paymentMethod: 'Tunai',
    status: 'Sukses',
  },
  {
    id: 'TX-2026-0526-003',
    timestamp: new Date('2026-05-26T11:45:00'),
    outletId: 'outlet-002',
    outletName: 'Outlet Cabang Kartini',
    cashierName: 'Dewi',
    items: [
      {
        productId: 'prod-003',
        productName: 'Ayam Geprek Sambal Bawang',
        sku: 'MKN-AGB-003',
        quantity: 2,
        unitPrice: 25000,
        hpp: 15000,
        subtotal: 50000,
      },
      {
        productId: 'prod-008',
        productName: 'Kopi Susu Kekinian',
        sku: 'MNM-KSK-003',
        quantity: 2,
        unitPrice: 22000,
        hpp: 9000,
        subtotal: 44000,
      },
    ],
    subtotal: 94000,
    taxRate: 0.11,
    taxAmount: 10340,
    discount: 0,
    totalPaid: 104340,
    paymentMethod: 'Debit/Kredit',
    status: 'Sukses',
  },
  {
    id: 'TX-2026-0525-004',
    timestamp: new Date('2026-05-25T14:20:00'),
    outletId: 'outlet-001',
    outletName: 'Outlet Cabang M. Yamin',
    cashierName: 'Andi',
    items: [
      {
        productId: 'prod-005',
        productName: 'Soto Ayam Lamongan',
        sku: 'MKN-SAL-005',
        quantity: 4,
        unitPrice: 20000,
        hpp: 11000,
        subtotal: 80000,
      },
      {
        productId: 'prod-006',
        productName: 'Es Teh Manis',
        sku: 'MNM-ETM-001',
        quantity: 4,
        unitPrice: 5000,
        hpp: 2000,
        subtotal: 20000,
      },
    ],
    subtotal: 100000,
    taxRate: 0.11,
    taxAmount: 11000,
    discount: 10000,
    totalPaid: 101000,
    paymentMethod: 'Tunai',
    status: 'Sukses',
  },
  {
    id: 'TX-2026-0525-005',
    timestamp: new Date('2026-05-25T16:00:00'),
    outletId: 'outlet-002',
    outletName: 'Outlet Cabang Kartini',
    cashierName: 'Farah',
    items: [
      {
        productId: 'prod-011',
        productName: 'Sabun Mandi Lifebuoy 80gr',
        sku: 'RTL-SML-001',
        quantity: 3,
        unitPrice: 7000,
        hpp: 4500,
        subtotal: 21000,
      },
      {
        productId: 'prod-014',
        productName: 'Minyak Goreng Bimoli 2L',
        sku: 'RTL-MGB-004',
        quantity: 2,
        unitPrice: 35000,
        hpp: 28000,
        subtotal: 70000,
      },
    ],
    subtotal: 91000,
    taxRate: 0.11,
    taxAmount: 10010,
    discount: 0,
    totalPaid: 101010,
    paymentMethod: 'QRIS',
    status: 'Sukses',
  },
  {
    id: 'TX-2026-0524-006',
    timestamp: new Date('2026-05-24T09:00:00'),
    outletId: 'outlet-001',
    outletName: 'Outlet Cabang M. Yamin',
    cashierName: 'Andi',
    items: [
      {
        productId: 'prod-002',
        productName: 'Mie Ayam Bakso',
        sku: 'MKN-MAB-002',
        quantity: 3,
        unitPrice: 18000,
        hpp: 10000,
        subtotal: 54000,
      },
      {
        productId: 'prod-007',
        productName: 'Jus Alpukat',
        sku: 'MNM-JAL-002',
        quantity: 2,
        unitPrice: 18000,
        hpp: 8000,
        subtotal: 36000,
      },
    ],
    subtotal: 90000,
    taxRate: 0.11,
    taxAmount: 9900,
    discount: 0,
    totalPaid: 99900,
    paymentMethod: 'Debit/Kredit',
    status: 'Sukses',
  },
];

// ─────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────
export const mockExpenses: Expense[] = [
  {
    id: 'EXP-2026-001',
    date: new Date('2026-05-01'),
    category: 'Sewa Tempat',
    description: 'Sewa kios bulan Mei 2026 - Outlet M. Yamin',
    amount: 3500000,
    outletId: 'outlet-001',
    hasReceipt: true,
    createdBy: 'Budi Santoso',
  },
  {
    id: 'EXP-2026-002',
    date: new Date('2026-05-05'),
    category: 'Tagihan Listrik',
    description: 'Tagihan PLN periode April 2026',
    amount: 650000,
    outletId: 'outlet-001',
    hasReceipt: true,
    createdBy: 'Andi',
  },
  {
    id: 'EXP-2026-003',
    date: new Date('2026-05-07'),
    category: 'Pembelian Supplier PO',
    description: 'Restock bahan baku mingguan dari CV. Sumber Makmur',
    amount: 2800000,
    outletId: 'outlet-001',
    hasReceipt: true,
    createdBy: 'Budi Santoso',
  },
  {
    id: 'EXP-2026-004',
    date: new Date('2026-05-10'),
    category: 'Gaji Karyawan',
    description: 'Pembayaran gaji karyawan periode 1-15 Mei 2026',
    amount: 7500000,
    outletId: 'outlet-001',
    hasReceipt: false,
    createdBy: 'Budi Santoso',
  },
  {
    id: 'EXP-2026-005',
    date: new Date('2026-05-12'),
    category: 'Pembelian Supplier PO',
    description: 'PO mingguan bahan baku Outlet Kartini',
    amount: 2200000,
    outletId: 'outlet-002',
    hasReceipt: true,
    createdBy: 'Siti Rahayu',
  },
  {
    id: 'EXP-2026-006',
    date: new Date('2026-05-15'),
    category: 'Perawatan Peralatan',
    description: 'Service kompor dan AC dapur Outlet M. Yamin',
    amount: 450000,
    outletId: 'outlet-001',
    hasReceipt: false,
    createdBy: 'Andi',
  },
  {
    id: 'EXP-2026-007',
    date: new Date('2026-05-18'),
    category: 'Transportasi',
    description: 'Bensin pengiriman bahan baku ke outlet',
    amount: 180000,
    outletId: 'outlet-001',
    hasReceipt: false,
    createdBy: 'Andi',
  },
  {
    id: 'EXP-2026-008',
    date: new Date('2026-05-20'),
    category: 'Tagihan Listrik',
    description: 'Tagihan PLN Outlet Kartini periode April 2026',
    amount: 520000,
    outletId: 'outlet-002',
    hasReceipt: true,
    createdBy: 'Siti Rahayu',
  },
];

// ─────────────────────────────────────────────
// Weekly Sales Analytics
// ─────────────────────────────────────────────
export const mockWeeklySales: WeeklySalesData[] = [
  { day: 'Sen', currentWeek: 1250000, previousWeek: 980000 },
  { day: 'Sel', currentWeek: 1480000, previousWeek: 1100000 },
  { day: 'Rab', currentWeek: 1320000, previousWeek: 1250000 },
  { day: 'Kam', currentWeek: 1650000, previousWeek: 1300000 },
  { day: 'Jum', currentWeek: 1890000, previousWeek: 1500000 },
  { day: 'Sab', currentWeek: 2200000, previousWeek: 1800000 },
  { day: 'Min', currentWeek: 1750000, previousWeek: 1400000 },
];

// ─────────────────────────────────────────────
// Payment Method Share
// ─────────────────────────────────────────────
export const mockPaymentMethodShare: PaymentMethodShare[] = [
  { name: 'QRIS', value: 45, color: '#6366f1' },
  { name: 'Tunai', value: 35, color: '#10b981' },
  { name: 'Debit/Kredit', value: 20, color: '#f59e0b' },
];

// ─────────────────────────────────────────────
// Top Products
// ─────────────────────────────────────────────
export const mockTopProducts: TopProduct[] = [
  {
    rank: 1,
    productId: 'prod-008',
    productName: 'Kopi Susu Kekinian',
    category: 'Minuman',
    quantitySold: 312,
    grossRevenue: 6864000,
    grossProfit: 4056000,
  },
  {
    rank: 2,
    productId: 'prod-001',
    productName: 'Nasi Goreng Spesial',
    category: 'Makanan',
    quantitySold: 248,
    grossRevenue: 5456000,
    grossProfit: 2480000,
  },
  {
    rank: 3,
    productId: 'prod-003',
    productName: 'Ayam Geprek Sambal Bawang',
    category: 'Makanan',
    quantitySold: 197,
    grossRevenue: 4925000,
    grossProfit: 1970000,
  },
  {
    rank: 4,
    productId: 'prod-012',
    productName: 'Indomie Goreng Original',
    category: 'Ritel',
    quantitySold: 480,
    grossRevenue: 1920000,
    grossProfit: 720000,
  },
  {
    rank: 5,
    productId: 'prod-006',
    productName: 'Es Teh Manis',
    category: 'Minuman',
    quantitySold: 520,
    grossRevenue: 2600000,
    grossProfit: 1560000,
  },
];

// ─────────────────────────────────────────────
// Shift Session
// ─────────────────────────────────────────────
export const mockShiftSession: ShiftSession = {
  id: 'SHF-mock-001',
  cashierId: 'user-002',
  cashierName: 'Andi Pratama',
  startTime: new Date('2026-05-26T08:00:00'),
  initialCash: 200000,
  expectedCash: 200000,
  isActive: true,
};

// ─────────────────────────────────────────────
// Business Profile
// ─────────────────────────────────────────────
export const mockBusinessProfile: BusinessProfile = {
  businessName: 'KasirKu Multi-Outlet',
  ownerName: 'Ahmad Fauzi',
  phone: '+62 812 3456 7890',
  email: 'admin@kasirku.id',
  address: 'Jl. Jend. Sudirman No. 100, Samarinda, Kalimantan Timur',
  taxId: '12.345.678.9-012.000',
};

// ─────────────────────────────────────────────
// Tax Settings
// ─────────────────────────────────────────────
export const mockTaxSettings: TaxSettings = {
  ppnEnabled: true,
  ppnRate: 0.11,
  serviceChargeEnabled: false,
  serviceChargeRate: 0.05,
};

// ─────────────────────────────────────────────
// Helper Formatters
// ─────────────────────────────────────────────
export const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ─────────────────────────────────────────────
// Customers / Members
// ─────────────────────────────────────────────
export const mockCustomers: Customer[] = [
  {
    id: 'cust-001',
    name: 'Budi Darmawan',
    phone: '08123456789',
    email: 'budi.darmawan@gmail.com',
    points: 125,
    joinedDate: new Date('2025-01-15T10:00:00'),
    tier: 'Gold',
    totalSpent: 2450000,
  },
  {
    id: 'cust-002',
    name: 'Citra Kirana',
    phone: '08234567890',
    email: 'citra.k@yahoo.com',
    points: 45,
    joinedDate: new Date('2025-03-22T14:30:00'),
    tier: 'Silver',
    totalSpent: 890000,
  },
  {
    id: 'cust-003',
    name: 'Dedi Hermawan',
    phone: '08571234567',
    points: 12,
    joinedDate: new Date('2025-05-10T11:15:00'),
    tier: 'Bronze',
    totalSpent: 250000,
  },
  {
    id: 'cust-004',
    name: 'Eka Lestari',
    phone: '08781234567',
    email: 'eka.lestari@gmail.com',
    points: 0,
    joinedDate: new Date('2026-05-20T16:45:00'),
    tier: 'Regular',
    totalSpent: 0,
  },
];

// ─────────────────────────────────────────────
// Diskon & Promo
// ─────────────────────────────────────────────
export const mockPromos: Promo[] = [
  {
    id: 'promo-001',
    code: 'DISKON10',
    name: 'Diskon Spesial 10%',
    type: 'Percentage',
    value: 10,
    minPurchase: 50000,
    startDate: new Date('2026-05-01T00:00:00'),
    endDate: new Date('2026-06-30T23:59:59'),
    isActive: true,
  },
  {
    id: 'promo-002',
    code: 'PROMOHEMAT',
    name: 'Potongan Hemat Rp 15.000',
    type: 'Fixed',
    value: 15000,
    minPurchase: 100000,
    startDate: new Date('2026-05-01T00:00:00'),
    endDate: new Date('2026-06-30T23:59:59'),
    isActive: true,
  },
  {
    id: 'promo-003',
    code: 'WEEKENDSERU',
    name: 'Promo Weekend Ceria 5%',
    type: 'Percentage',
    value: 5,
    minPurchase: 30000,
    startDate: new Date('2026-05-23T00:00:00'),
    endDate: new Date('2026-05-28T23:59:59'),
    isActive: true,
  },
];

// ─────────────────────────────────────────────
// Users / Auth
// ─────────────────────────────────────────────
export const mockUsers: User[] = [
  {
    id: 'user-001',
    name: 'Ahmad Fauzi',
    email: 'owner@kasirku.id',
    role: 'Owner',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
  },
  {
    id: 'user-002',
    name: 'Andi Pratama',
    email: 'cashier@kasirku.id',
    role: 'Cashier',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&h=80&q=80',
    outletId: 'outlet-001',
  },
];

// ─────────────────────────────────────────────
// Suppliers
// ─────────────────────────────────────────────
export const mockSuppliers: Supplier[] = [
  {
    id: 'sup-001',
    name: 'CV. Sumber Makmur Mandiri',
    contactName: 'Hendra Wijaya',
    phone: '08129876543',
    email: 'sales@sumbermakmur.com',
    address: 'Kawasan Industri Pergudangan Yos Sudarso No. 8, Samarinda',
  },
  {
    id: 'sup-002',
    name: 'PT. Ritel Indo Grosir',
    contactName: 'Lina Marlina',
    phone: '08215432109',
    email: 'order@ritelindogrosir.id',
    address: 'Jl. Slamet Riyadi No. 120, Karang Asam, Samarinda',
  },
];

// ─────────────────────────────────────────────
// Purchase Orders
// ─────────────────────────────────────────────
export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'PO-2026-0520-001',
    supplierId: 'sup-001',
    supplierName: 'CV. Sumber Makmur Mandiri',
    items: [
      {
        productId: 'prod-001',
        productName: 'Nasi Goreng Spesial',
        sku: 'MKN-NGS-001',
        quantity: 50,
        costPrice: 12000,
        subtotal: 600000,
      },
      {
        productId: 'prod-002',
        productName: 'Mie Ayam Bakso',
        sku: 'MKN-MAB-002',
        quantity: 50,
        costPrice: 10000,
        subtotal: 500000,
      },
    ],
    totalAmount: 1100000,
    status: 'Diterima',
    dateCreated: new Date('2026-05-20T10:00:00'),
    dateReceived: new Date('2026-05-22T14:30:00'),
    outletId: 'outlet-001',
  },
  {
    id: 'PO-2026-0525-002',
    supplierId: 'sup-002',
    supplierName: 'PT. Ritel Indo Grosir',
    items: [
      {
        productId: 'prod-012',
        productName: 'Indomie Goreng Original',
        sku: 'RTL-IGO-002',
        quantity: 100,
        costPrice: 2500,
        subtotal: 250000,
      },
    ],
    totalAmount: 250000,
    status: 'Dipesan',
    dateCreated: new Date('2026-05-25T09:15:00'),
    outletId: 'outlet-001',
  },
];


