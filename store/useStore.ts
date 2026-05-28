import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CartItem,
  Outlet,
  Product,
  Transaction,
  Expense,
  TaxSettings,
  Customer,
  Promo,
  User,
  ShiftSession,
  Supplier,
  PurchaseOrder,
  ProductVariant,
  ProductModifier,
  StockLedgerEntry,
  BusinessProfile,
} from '@/types/pos';
import {
  mockOutlets,
  mockProducts,
  mockTransactions,
  mockExpenses,
  mockTaxSettings,
  mockCustomers,
  mockPromos,
  mockUsers,
  mockSuppliers,
  mockPurchaseOrders,
  mockBusinessProfile,
} from '@/data/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─────────────────────────────────────────────
// Store Shape
// ─────────────────────────────────────────────
interface KasirKuStore {
  // Initialization Sync
  initializeData: () => Promise<void>;

  // Auth
  currentUser: User | null;
  login: (email: string, role: 'Owner' | 'Cashier', password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Shift & Cash Drawer
  activeShift: ShiftSession | null;
  shiftsHistory: ShiftSession[];
  openShift: (initialCash: number) => Promise<void>;
  closeShift: (actualCash: number, notes?: string) => Promise<ShiftSession | null>;

  // Business Profile & Settings
  businessProfile: BusinessProfile;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => Promise<void>;

  // Outlet / Tenant
  outlets: Outlet[];
  activeOutlet: Outlet;
  setActiveOutlet: (outlet: Outlet) => void;
  toggleOutletStatus: (outletId: string) => Promise<void>;
  addOutlet: (outlet: Outlet) => Promise<void>;
  updateOutlet: (outletId: string, updates: Partial<Outlet>) => Promise<void>;

  // Products
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  adjustStockManual: (productId: string, newStock: number, notes: string) => Promise<void>;

  // Cart (POS)
  cart: CartItem[];
  addToCart: (product: Product, selectedVariant?: ProductVariant, selectedModifiers?: ProductModifier[]) => void;
  removeFromCart: (productId: string, selectedVariant?: ProductVariant, selectedModifiers?: ProductModifier[]) => void;
  updateCartQuantity: (productId: string, quantity: number, selectedVariant?: ProductVariant, selectedModifiers?: ProductModifier[]) => void;
  updateCartItem: (
    productId: string,
    oldVariant?: ProductVariant,
    oldModifiers?: ProductModifier[],
    newVariant?: ProductVariant,
    newModifiers?: ProductModifier[],
    newQuantity?: number
  ) => void;
  clearCart: () => void;
  voucherDiscount: number;
  setVoucherDiscount: (amount: number) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  pointsToRedeem: number;
  setPointsToRedeem: (points: number) => void;
  activePromo: Promo | null;
  setActivePromo: (promo: Promo | null) => void;

  // Customers
  customers: Customer[];
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;

  // Promos
  promos: Promo[];
  addPromo: (promo: Promo) => Promise<void>;
  updatePromo: (promoId: string, updates: Partial<Promo>) => Promise<void>;
  deletePromo: (promoId: string) => Promise<void>;

  // Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;

  // Purchase Orders (PO)
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  updatePurchaseOrder: (poId: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  receivePurchaseOrder: (poId: string) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => Promise<void>;
  refundTransactionItem: (transactionId: string, productId: string, refundQty: number, notes?: string) => Promise<void>;

  // Stock Ledger
  stockLedger: StockLedgerEntry[];

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>;

  // Tax Settings
  taxSettings: TaxSettings;
  updateTaxSettings: (settings: Partial<TaxSettings>) => Promise<void>;

  // Users / Staff
  users: User[];
  addUser: (user: User) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

// ─────────────────────────────────────────────
// Zustand Store
// ─────────────────────────────────────────────
export const useStore = create<KasirKuStore>()(
  persist(
    (set, get) => ({
      // ── Auth & Users ─────────────────────────
      currentUser: null,

      users: mockUsers.map((u) => ({
        ...u,
        password: u.role === 'Owner' ? 'owner123' : 'cashier123',
        phone: u.role === 'Owner' ? '08123456789' : '08987654321',
        isActive: true,
        permissions: u.role === 'Owner' ? [
          'view_reports',
          'manage_inventory',
          'process_refunds',
          'manage_promos',
          'manage_expenses',
          'manage_suppliers_po',
          'manage_settings',
          'manage_staff',
        ] : [],
      })),

      initializeData: async () => {
        if (!isSupabaseConfigured) return;

        try {
          const currentUser = get().currentUser;
          if (!currentUser) return;

          const currentUserId = currentUser.id;
          const currentUserRole = currentUser.role;
          const currentUserOutletId = currentUser.outletId;

          // 1. Fetch Outlets based on role
          let dbOutlets: any[] | null = null;
          if (currentUserRole === 'Owner') {
            const { data, error } = await supabase
              .from('outlets')
              .select('*')
              .eq('owner_id', currentUserId);
            
            if (error && error.message.includes('column "owner_id" does not exist')) {
              console.warn('owner_id column is missing in outlets table. Falling back.');
              const fallback = await supabase.from('outlets').select('*');
              dbOutlets = fallback.data;
            } else {
              dbOutlets = data;
            }
          } else {
            // Cashier: only load their assigned outlet
            const { data } = await supabase
              .from('outlets')
              .select('*')
              .eq('id', currentUserOutletId || '');
            dbOutlets = data;
          }

          // Map outlets
          const mappedOutlets = (dbOutlets || []).map((o: any) => ({
            id: o.id,
            name: o.name,
            address: o.address || '',
            staffCount: Number(o.staff_count || 0),
            isActive: o.is_active !== false,
            phone: o.phone || '',
            manager: o.manager || '',
          }));

          const ownerId = currentUserRole === 'Owner' ? currentUserId : (dbOutlets?.[0]?.owner_id || null);
          const ownerOutletIds = mappedOutlets.map((o) => o.id);

          // 2. Fetch all other tables, filtered by allowed outlets and ownerId
          let productsQuery = supabase.from('products').select('*');
          let transactionsQuery = supabase.from('transactions').select('*, transaction_items(*)');
          let expensesQuery = supabase.from('expenses').select('*');
          let purchaseOrdersQuery = supabase.from('purchase_orders').select('*, purchase_order_items(*)');
          let stockLedgerQuery = supabase.from('stock_ledger').select('*');

          let taxSettingsQuery = supabase.from('tax_settings').select('*');
          let customersQuery = supabase.from('customers').select('*');
          let promosQuery = supabase.from('promos').select('*');
          let suppliersQuery = supabase.from('suppliers').select('*');
          let shiftSessionsQuery = supabase.from('shift_sessions').select('*').order('start_time', { ascending: false });

          if (ownerOutletIds.length > 0) {
            productsQuery = productsQuery.in('outlet_id', ownerOutletIds);
            transactionsQuery = transactionsQuery.in('outlet_id', ownerOutletIds);
            expensesQuery = expensesQuery.in('outlet_id', ownerOutletIds);
            purchaseOrdersQuery = purchaseOrdersQuery.in('outlet_id', ownerOutletIds);
            stockLedgerQuery = stockLedgerQuery.in('outlet_id', ownerOutletIds);
          } else {
            // No outlets: force empty filters
            productsQuery = productsQuery.eq('outlet_id', 'non-existent');
            transactionsQuery = transactionsQuery.eq('outlet_id', 'non-existent');
            expensesQuery = expensesQuery.eq('outlet_id', 'non-existent');
            purchaseOrdersQuery = purchaseOrdersQuery.eq('outlet_id', 'non-existent');
            stockLedgerQuery = stockLedgerQuery.eq('outlet_id', 'non-existent');
          }

          // Apply owner filters if ownerId is available
          if (ownerId) {
            taxSettingsQuery = taxSettingsQuery.eq('owner_id', ownerId);
            customersQuery = customersQuery.eq('owner_id', ownerId);
            promosQuery = promosQuery.eq('owner_id', ownerId);
            suppliersQuery = suppliersQuery.eq('owner_id', ownerId);
          }

          const [
            { data: dbProducts },
            { data: dbTransactions },
            { data: dbExpenses },
            { data: dbPurchaseOrders },
            { data: dbStockLedger },
            dbTaxSettingsResult,
            dbCustomersResult,
            dbPromosResult,
            dbSuppliersResult,
            { data: dbProfiles },
            { data: dbShiftSessions }
          ] = await Promise.all([
            productsQuery,
            transactionsQuery,
            expensesQuery,
            purchaseOrdersQuery,
            stockLedgerQuery,
            taxSettingsQuery,
            customersQuery,
            promosQuery,
            suppliersQuery,
            supabase.from('profiles').select('*'),
            shiftSessionsQuery
          ]);

          // Fallback handlers for missing owner_id columns
          let dbTaxSettings = dbTaxSettingsResult.data;
          if (dbTaxSettingsResult.error && dbTaxSettingsResult.error.message.includes('column "owner_id" does not exist')) {
            const fallback = await supabase.from('tax_settings').select('*');
            dbTaxSettings = fallback.data;
          }

          let dbCustomers = dbCustomersResult.data;
          if (dbCustomersResult.error && dbCustomersResult.error.message.includes('column "owner_id" does not exist')) {
            const fallback = await supabase.from('customers').select('*');
            dbCustomers = fallback.data;
          }

          let dbPromos = dbPromosResult.data;
          if (dbPromosResult.error && dbPromosResult.error.message.includes('column "owner_id" does not exist')) {
            const fallback = await supabase.from('promos').select('*');
            dbPromos = fallback.data;
          }

          let dbSuppliers = dbSuppliersResult.data;
          if (dbSuppliersResult.error && dbSuppliersResult.error.message.includes('column "owner_id" does not exist')) {
            const fallback = await supabase.from('suppliers').select('*');
            dbSuppliers = fallback.data;
          }

          // Map and populate products
          const mappedProducts = (dbProducts || []).map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category as any,
            purchasePrice: Number(p.purchase_price),
            sellingPrice: Number(p.selling_price),
            stock: Number(p.stock),
            minStock: Number(p.min_stock),
            outletId: p.outlet_id,
            imageUrl: p.image_url || undefined,
            description: p.description || undefined,
            variants: p.variants || undefined,
            modifiers: p.modifiers || undefined,
            unit: p.unit || 'pcs',
            purchaseUnit: p.purchase_unit || undefined,
            conversionRate: p.conversion_rate !== undefined ? Number(p.conversion_rate) : undefined,
          }));

          // Map and populate customers
          const mappedCustomers = (dbCustomers || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email || undefined,
            points: Number(c.points),
            joinedDate: new Date(c.joined_date),
            tier: c.tier as any,
            totalSpent: Number(c.total_spent),
          }));

          // Map and populate promos
          const mappedPromos = (dbPromos || []).map((p: any) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            type: p.type as any,
            value: Number(p.value),
            minPurchase: Number(p.min_purchase),
            startDate: new Date(p.start_date),
            endDate: new Date(p.end_date),
            isActive: p.is_active,
          }));

          // Map and populate transactions
          const mappedTransactions = (dbTransactions || []).map((tx: any) => ({
            id: tx.id,
            timestamp: new Date(tx.timestamp),
            outletId: tx.outlet_id || 'outlet-001',
            outletName: tx.outlet_name || 'Outlet Utama',
            cashierName: tx.cashier_name || 'Kasir',
            subtotal: Number(tx.subtotal),
            taxRate: Number(tx.tax_rate),
            taxAmount: Number(tx.tax_amount),
            discount: Number(tx.discount),
            totalPaid: Number(tx.total_paid),
            paymentMethod: tx.payment_method as any,
            status: tx.status as any,
            notes: tx.notes || undefined,
            customerId: tx.customer_id || undefined,
            customerName: tx.customer_name || undefined,
            promoCode: tx.promo_code || undefined,
            memberDiscount: Number(tx.member_discount || 0),
            promoDiscount: Number(tx.promo_discount || 0),
            pointsEarned: Number(tx.points_earned || 0),
            pointsRedeemed: Number(tx.points_redeemed || 0),
            pointsDiscount: Number(tx.points_discount || 0),
            refundedAmount: Number(tx.refunded_amount || 0),
            items: (tx.transaction_items || []).map((item: any) => ({
              productId: item.product_id,
              productName: item.product_name,
              sku: item.sku,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unit_price),
              hpp: Number(item.hpp),
              subtotal: Number(item.subtotal),
              selectedVariant: item.selected_variant || undefined,
              selectedModifiers: item.selected_modifiers || undefined,
              refundedQty: Number(item.refunded_qty || 0),
            })),
          }));

          // Map and populate expenses
          const mappedExpenses = (dbExpenses || []).map((exp: any) => ({
            id: exp.id,
            date: new Date(exp.date),
            category: exp.category as any,
            description: exp.description || '',
            amount: Number(exp.amount),
            outletId: exp.outlet_id,
            hasReceipt: exp.has_receipt,
            createdBy: exp.created_by || '',
            receiptUrl: exp.receipt_url || undefined,
          }));

          // Map and populate suppliers
          const mappedSuppliers = (dbSuppliers || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            contactName: s.contact_name || undefined,
            phone: s.phone,
            email: s.email || undefined,
            address: s.address,
          }));

          // Map and populate POs
          const mappedPurchaseOrders = (dbPurchaseOrders || []).map((po: any) => ({
            id: po.id,
            supplierId: po.supplier_id,
            supplierName: po.supplier_name,
            totalAmount: Number(po.total_amount),
            status: po.status as any,
            dateCreated: new Date(po.date_created),
            dateReceived: po.date_received ? new Date(po.date_received) : undefined,
            outletId: po.outlet_id,
            items: (po.purchase_order_items || []).map((item: any) => ({
              productId: item.product_id,
              productName: item.product_name,
              sku: item.sku,
              quantity: Number(item.quantity),
              costPrice: Number(item.cost_price),
              subtotal: Number(item.subtotal),
              purchaseUnit: item.purchase_unit || undefined,
              conversionRate: item.conversion_rate !== undefined ? Number(item.conversion_rate) : undefined,
            })),
          }));

          // Map and populate stock ledger
          const mappedStockLedger = (dbStockLedger || []).map((sl: any) => ({
            id: sl.id,
            productId: sl.product_id,
            productName: sl.product_name,
            sku: sl.sku,
            timestamp: new Date(sl.timestamp),
            changeType: sl.change_type as any,
            quantityChange: Number(sl.quantity_change),
            stockAfter: Number(sl.stock_after),
            referenceId: sl.reference_id || undefined,
            notes: sl.notes || undefined,
            createdBy: sl.created_by || '',
            outletId: sl.outlet_id,
          }));

          // Map and populate user profiles (filtered in JS)
          const mappedUsers = (dbProfiles || [])
            .filter((p: any) => p.id === currentUserId || (p.role === 'Cashier' && ownerOutletIds.includes(p.outlet_id)))
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              email: p.email,
              role: p.role as any,
              avatarUrl: p.avatar_url || undefined,
              outletId: p.outlet_id || undefined,
              phone: p.phone || undefined,
              isActive: p.is_active !== false,
              permissions: p.permissions || [],
            }));

          // Map tax settings
          const mappedTaxSettings = dbTaxSettings && dbTaxSettings[0] ? {
            ppnEnabled: dbTaxSettings[0].ppn_enabled !== false,
            ppnRate: Number(dbTaxSettings[0].ppn_rate || 0.11),
            serviceChargeEnabled: dbTaxSettings[0].service_charge_enabled !== false,
            serviceChargeRate: Number(dbTaxSettings[0].service_charge_rate || 0.05),
          } : get().taxSettings;

          // Reconstruct business profile dynamically for the Owner
          let mappedBusinessProfile = get().businessProfile;
          if (currentUserRole === 'Owner') {
            const primaryOutlet = mappedOutlets[0]; // The default primary outlet
            mappedBusinessProfile = {
              businessName: primaryOutlet ? primaryOutlet.name : 'KasirKu Multi-Outlet',
              ownerName: currentUser.name || '',
              phone: currentUser.phone || '',
              email: currentUser.email || '',
              address: primaryOutlet ? primaryOutlet.address : '',
              taxId: '', // Default or read from somewhere else
            };
          }

          const finalOutlets = mappedOutlets.length > 0 ? mappedOutlets : get().outlets;
          const currentActive = get().activeOutlet;
          let newActiveOutlet = currentActive;
          if (finalOutlets.length > 0) {
            const found = finalOutlets.find((o: any) => o.id === currentActive?.id);
            newActiveOutlet = found || finalOutlets[0];
          }

          // Map and populate shifts history
          const mappedShifts = (dbShiftSessions || []).map((sh: any) => ({
            id: sh.id,
            cashierId: sh.cashier_id || 'cashier-001',
            cashierName: sh.cashier_name,
            startTime: new Date(sh.start_time),
            endTime: sh.end_time ? new Date(sh.end_time) : undefined,
            initialCash: Number(sh.initial_cash),
            expectedCash: Number(sh.expected_cash),
            actualCash: sh.actual_cash !== null ? Number(sh.actual_cash) : undefined,
            difference: sh.difference !== null ? Number(sh.difference) : undefined,
            notes: sh.notes || undefined,
            isActive: sh.is_active,
          }));

          const allowedUserIds = mappedUsers.map((u: any) => u.id);
          const filteredShifts = mappedShifts.filter((sh: any) => allowedUserIds.includes(sh.cashierId) || sh.cashierId === 'cashier-001');

          set({
            outlets: finalOutlets,
            activeOutlet: newActiveOutlet,
            products: mappedProducts,
            customers: mappedCustomers,
            promos: mappedPromos,
            transactions: mappedTransactions,
            expenses: mappedExpenses,
            suppliers: mappedSuppliers,
            purchaseOrders: mappedPurchaseOrders,
            stockLedger: mappedStockLedger,
            users: mappedUsers,
            shiftsHistory: filteredShifts,
            taxSettings: mappedTaxSettings,
            businessProfile: mappedBusinessProfile,
          });
        } catch (err) {
          console.error('Error during Supabase store initialization:', err);
        }
      },

      login: async (email, role, password) => {
        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: email.toLowerCase(),
              password: password || 'defaultPassword123'
            });

            if (error) {
              console.error('Supabase Auth error:', error.message);
              return { success: false, error: error.message };
            }

            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user?.id)
              .single();

            if (profileError || !profile) {
              console.error('Error fetching profile:', profileError?.message);
              return { success: false, error: `Profil database tidak ditemukan: ${profileError?.message || 'data kosong'}` };
            }

            if (profile.role !== role) {
              console.warn('Role mismatch');
              return { success: false, error: `Peran tidak sesuai. Anda terdaftar sebagai ${profile.role}` };
            }

            if (profile.is_active === false) {
              console.warn('User inactive');
              return { success: false, error: 'Akun Anda tidak aktif' };
            }

            const mappedUser: User = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role as any,
              avatarUrl: profile.avatar_url || undefined,
              outletId: profile.outlet_id || undefined,
              phone: profile.phone || undefined,
              isActive: profile.is_active !== false,
              permissions: profile.permissions || [],
            };

            set({ currentUser: mappedUser });
            await get().initializeData();
            return { success: true };
          } catch (err: any) {
            console.error('Login process error:', err);
            return { success: false, error: err?.message || 'Terjadi kesalahan sistem' };
          }
        }

        // Local fallback logic
        const user = get().users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.role === role
        );
        if (user && user.isActive !== false) {
          set({ currentUser: user });
          return { success: true };
        }
        return { success: false, error: 'Email atau peran salah (offline mode)' };
      },

      logout: () => set({ currentUser: null, activeShift: null }),

      addUser: async (user) => {
        if (isSupabaseConfigured) {
          try {
            const response = await fetch('/api/staff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: user.name,
                email: user.email,
                password: user.password,
                role: user.role,
                outletId: user.outletId,
                permissions: user.permissions,
                phone: user.phone,
                isActive: user.isActive !== false,
              }),
            });

            const resData = await response.json();
            if (!response.ok) {
              throw new Error(resData.error || 'Gagal mendaftarkan staf');
            }

            await get().initializeData();
            return;
          } catch (err: any) {
            console.error('Error adding user to Supabase:', err.message);
            throw err;
          }
        }

        // Local Fallback
        set((state) => ({
          users: [...state.users, { ...user, id: user.id || `user-${Date.now()}` }],
        }));
      },

      updateUser: async (userId, updates) => {
        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('profiles')
              .update({
                name: updates.name,
                email: updates.email,
                role: updates.role,
                outlet_id: updates.outletId,
                permissions: updates.permissions,
                phone: updates.phone,
                is_active: updates.isActive,
              })
              .eq('id', userId);

            if (error) throw error;
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error updating user in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => {
          const updatedUsers = state.users.map((u) =>
            u.id === userId ? { ...u, ...updates } : u
          );
          const updatedCurrentUser = state.currentUser?.id === userId
            ? { ...state.currentUser, ...updates }
            : state.currentUser;
          return {
            users: updatedUsers,
            currentUser: updatedCurrentUser,
          };
        });
      },

      deleteUser: async (userId) => {
        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error deleting user in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
        }));
      },

      // ── Shift & Cash Drawer ──────────────────
      activeShift: null,
      shiftsHistory: [],

      // ── Stock Ledger ─────────────────────────
      stockLedger: [
        {
          id: 'LEDGER-mock-001',
          productId: 'prod-001',
          productName: 'Nasi Goreng Spesial',
          sku: 'MKN-NGS-001',
          timestamp: new Date('2026-05-22T14:30:00'),
          changeType: 'Penerimaan PO',
          quantityChange: 50,
          stockAfter: 50,
          referenceId: 'PO-2026-0520-001',
          createdBy: 'Ahmad Fauzi',
          outletId: 'outlet-001',
        },
        {
          id: 'LEDGER-mock-002',
          productId: 'prod-002',
          productName: 'Mie Ayam Bakso',
          sku: 'MKN-MAB-002',
          timestamp: new Date('2026-05-22T14:30:00'),
          changeType: 'Penerimaan PO',
          quantityChange: 50,
          stockAfter: 50,
          referenceId: 'PO-2026-0520-001',
          createdBy: 'Ahmad Fauzi',
          outletId: 'outlet-001',
        },
        {
          id: 'LEDGER-mock-003',
          productId: 'prod-001',
          productName: 'Nasi Goreng Spesial',
          sku: 'MKN-NGS-001',
          timestamp: new Date('2026-05-25T11:20:00'),
          changeType: 'Penjualan',
          quantityChange: -2,
          stockAfter: 48,
          referenceId: 'TX-2026-0525-001',
          createdBy: 'Andi Pratama',
          outletId: 'outlet-001',
        }
      ],

      openShift: async (initialCash) => {
        const newShift: ShiftSession = {
          id: `SHF-${Date.now()}`,
          cashierId: get().currentUser?.id || 'cashier-001',
          cashierName: get().currentUser?.name || 'Kasir',
          startTime: new Date(),
          initialCash,
          expectedCash: initialCash,
          isActive: true,
        };

        if (isSupabaseConfigured) {
          try {
            await supabase.from('shift_sessions').insert([
              {
                id: newShift.id,
                cashier_id: newShift.cashierId === 'cashier-001' ? null : newShift.cashierId,
                cashier_name: newShift.cashierName,
                start_time: newShift.startTime.toISOString(),
                initial_cash: newShift.initialCash,
                expected_cash: newShift.expectedCash,
                is_active: true,
              }
            ]);
            set({ activeShift: newShift });
            return;
          } catch (err) {
            console.error('Failed to open shift in Supabase:', err);
          }
        }

        // Local Fallback
        set({ activeShift: newShift });
      },

      closeShift: async (actualCash, notes = '') => {
        const currentShift = get().activeShift;
        if (!currentShift) return null;

        const difference = actualCash - currentShift.expectedCash;
        const completedShift: ShiftSession = {
          ...currentShift,
          endTime: new Date(),
          actualCash,
          difference,
          notes,
          isActive: false,
        };

        if (isSupabaseConfigured) {
          try {
            await supabase
              .from('shift_sessions')
              .update({
                end_time: completedShift.endTime?.toISOString(),
                actual_cash: actualCash,
                difference,
                notes,
                is_active: false,
              })
              .eq('id', currentShift.id);

            set({
              activeShift: null,
              shiftsHistory: [completedShift, ...get().shiftsHistory],
            });
            return completedShift;
          } catch (err) {
            console.error('Failed to close shift in Supabase:', err);
          }
        }

        // Local Fallback
        set({
          activeShift: null,
          shiftsHistory: [completedShift, ...get().shiftsHistory],
        });
        return completedShift;
      },

      // ── Business Profile & Settings ──────────
      businessProfile: mockBusinessProfile,

      updateBusinessProfile: async (updates) => {
        if (isSupabaseConfigured && get().currentUser?.role === 'Owner') {
          try {
            const ownerId = get().currentUser?.id;
            await supabase.from('profiles').update({
              name: updates.ownerName,
              phone: updates.phone,
            }).eq('id', ownerId);

            const primaryOutlet = get().outlets[0];
            if (primaryOutlet) {
              await supabase.from('outlets').update({
                name: updates.businessName,
                address: updates.address,
                phone: updates.phone,
              }).eq('id', primaryOutlet.id);
            }
          } catch (err) {
            console.error('Failed to update business profile in Supabase:', err);
          }
        }

        set((state) => ({
          businessProfile: { ...state.businessProfile, ...updates },
        }));
      },

      // ── Outlets ──────────────────────────────
      outlets: mockOutlets,
      activeOutlet: mockOutlets[0],

      setActiveOutlet: (outlet) => set({ activeOutlet: outlet }),

      addOutlet: async (outlet) => {
        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase.from('outlets').insert([
              {
                id: outlet.id,
                name: outlet.name,
                address: outlet.address || '',
                staff_count: outlet.staffCount || 0,
                is_active: outlet.isActive !== false,
                phone: outlet.phone || '',
                manager: outlet.manager || '',
                owner_id: get().currentUser?.id || null,
              }
            ]);
            if (error) throw error;
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Failed to add outlet to Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          outlets: [...state.outlets, outlet],
        }));
      },

      updateOutlet: async (outletId, updates) => {
        if (isSupabaseConfigured) {
          try {
            const mappedUpdates: any = {};
            if (updates.name !== undefined) mappedUpdates.name = updates.name;
            if (updates.address !== undefined) mappedUpdates.address = updates.address;
            if (updates.staffCount !== undefined) mappedUpdates.staff_count = updates.staffCount;
            if (updates.isActive !== undefined) mappedUpdates.is_active = updates.isActive;
            if (updates.phone !== undefined) mappedUpdates.phone = updates.phone;
            if (updates.manager !== undefined) mappedUpdates.manager = updates.manager;

            const { error } = await supabase
              .from('outlets')
              .update(mappedUpdates)
              .eq('id', outletId);
            if (error) throw error;

            const currentActive = get().activeOutlet;
            if (currentActive.id === outletId) {
              set({ activeOutlet: { ...currentActive, ...updates } });
            }

            await get().initializeData();
            return;
          } catch (err) {
            console.error('Failed to update outlet in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => {
          const updatedOutlets = state.outlets.map((o) =>
            o.id === outletId ? { ...o, ...updates } : o
          );
          const currentActive = state.activeOutlet;
          const updatedActive = currentActive.id === outletId
            ? { ...currentActive, ...updates }
            : currentActive;
          return {
            outlets: updatedOutlets,
            activeOutlet: updatedActive,
          };
        });
      },

      toggleOutletStatus: async (outletId) => {
        const currentOutlet = get().outlets.find(o => o.id === outletId);
        if (isSupabaseConfigured && currentOutlet) {
          try {
            await supabase.from('outlets').update({
              is_active: !currentOutlet.isActive
            }).eq('id', outletId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error toggling outlet status in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          outlets: state.outlets.map((o) =>
            o.id === outletId ? { ...o, isActive: !o.isActive } : o
          ),
        }));
      },

      // ── Products ─────────────────────────────
      products: mockProducts,

      addProduct: async (product) => {
        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase.from('products').insert([
              {
                id: product.id,
                name: product.name,
                sku: product.sku,
                category: product.category,
                purchase_price: product.purchasePrice,
                selling_price: product.sellingPrice,
                stock: product.stock,
                min_stock: product.minStock,
                outlet_id: product.outletId,
                image_url: product.imageUrl || null,
                description: product.description || null,
                variants: product.variants || [],
                modifiers: product.modifiers || [],
                unit: product.unit || 'pcs',
                purchase_unit: product.purchaseUnit || null,
                conversion_rate: product.conversionRate || 1,
              }
            ]);

            if (error) throw error;

            const ledgerEntry = {
              id: `LEDGER-${Date.now()}-add`,
              product_id: product.id,
              product_name: product.name,
              sku: product.sku,
              timestamp: new Date().toISOString(),
              change_type: 'Penyesuaian Manual',
              quantity_change: product.stock,
              stock_after: product.stock,
              created_by: get().currentUser?.name || 'Owner',
              outlet_id: product.outletId,
            };

            await supabase.from('stock_ledger').insert([ledgerEntry]);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Failed to add product to Supabase:', err);
          }
        }

        // Local Fallback
        const ledgerEntry: StockLedgerEntry = {
          id: `LEDGER-${Date.now()}-add`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          timestamp: new Date(),
          changeType: 'Penyesuaian Manual',
          quantityChange: product.stock,
          stockAfter: product.stock,
          createdBy: get().currentUser?.name || 'Owner',
          outletId: product.outletId,
        };
        set((state) => ({
          products: [...state.products, product],
          stockLedger: [ledgerEntry, ...state.stockLedger],
        }));
      },

      updateProduct: async (productId, updates) => {
        if (isSupabaseConfigured) {
          try {
            const original = get().products.find((p) => p.id === productId);
            const { error } = await supabase
              .from('products')
              .update({
                name: updates.name,
                sku: updates.sku,
                category: updates.category,
                purchase_price: updates.purchasePrice,
                selling_price: updates.sellingPrice,
                stock: updates.stock,
                min_stock: updates.minStock,
                outlet_id: updates.outletId,
                image_url: updates.imageUrl || null,
                description: updates.description || null,
                variants: updates.variants || [],
                modifiers: updates.modifiers || [],
                unit: updates.unit,
                purchase_unit: updates.purchaseUnit !== undefined ? updates.purchaseUnit : undefined,
                conversion_rate: updates.conversionRate !== undefined ? updates.conversionRate : undefined,
              })
              .eq('id', productId);

            if (error) throw error;

            if (original && updates.stock !== undefined && updates.stock !== original.stock) {
              const difference = updates.stock - original.stock;
              const ledgerEntry = {
                id: `LEDGER-${Date.now()}-edit`,
                product_id: productId,
                product_name: original.name,
                sku: original.sku,
                timestamp: new Date().toISOString(),
                change_type: 'Penyesuaian Manual',
                quantity_change: difference,
                stock_after: updates.stock,
                notes: 'Pembaruan detail stok produk',
                created_by: get().currentUser?.name || 'Owner',
                outlet_id: original.outletId,
              };
              await supabase.from('stock_ledger').insert([ledgerEntry]);
            }
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Failed to update product in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => {
          const original = state.products.find((p) => p.id === productId);
          let newLedgerEntries = [...state.stockLedger];

          if (original && updates.stock !== undefined && updates.stock !== original.stock) {
            const difference = updates.stock - original.stock;
            const ledgerEntry: StockLedgerEntry = {
              id: `LEDGER-${Date.now()}-edit`,
              productId,
              productName: original.name,
              sku: original.sku,
              timestamp: new Date(),
              changeType: 'Penyesuaian Manual',
              quantityChange: difference,
              stockAfter: updates.stock,
              notes: 'Pembaruan detail stok produk',
              createdBy: state.currentUser?.name || 'Owner',
              outletId: original.outletId,
            };
            newLedgerEntries = [ledgerEntry, ...newLedgerEntries];
          }

          return {
            products: state.products.map((p) =>
              p.id === productId ? { ...p, ...updates } : p
            ),
            stockLedger: newLedgerEntries,
          };
        });
      },

      deleteProduct: async (productId) => {
        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) throw error;
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Failed to delete product from Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        }));
      },

      adjustStockManual: async (productId, newStock, notes) => {
        const original = get().products.find((p) => p.id === productId);
        if (!original) return;
        
        const difference = newStock - original.stock;
        
        if (isSupabaseConfigured) {
          try {
            const { error: prodError } = await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', productId);
            if (prodError) throw prodError;

            const ledgerEntry = {
              id: `LEDGER-${Date.now()}-opname`,
              product_id: productId,
              product_name: original.name,
              sku: original.sku,
              timestamp: new Date().toISOString(),
              change_type: 'Penyesuaian Manual',
              quantity_change: difference,
              stock_after: newStock,
              notes: notes || 'Stok Opname',
              created_by: get().currentUser?.name || 'Owner',
              outlet_id: original.outletId,
            };
            const { error: ledgerError } = await supabase.from('stock_ledger').insert([ledgerEntry]);
            if (ledgerError) throw ledgerError;

            await get().initializeData();
          } catch (err) {
            console.error('Failed to execute stock opname in Supabase:', err);
            throw err;
          }
        } else {
          // Local fallback
          set((state) => {
            const ledgerEntry: StockLedgerEntry = {
              id: `LEDGER-${Date.now()}-opname`,
              productId,
              productName: original.name,
              sku: original.sku,
              timestamp: new Date(),
              changeType: 'Penyesuaian Manual',
              quantityChange: difference,
              stockAfter: newStock,
              notes: notes || 'Stok Opname',
              createdBy: state.currentUser?.name || 'Owner',
              outletId: original.outletId,
            };
            return {
              products: state.products.map((p) =>
                p.id === productId ? { ...p, stock: newStock } : p
              ),
              stockLedger: [ledgerEntry, ...state.stockLedger],
            };
          });
        }
      },

      // ── Cart ─────────────────────────────────
      cart: [],
      voucherDiscount: 0,
      selectedCustomer: null,
      activePromo: null,

      addToCart: (product, selectedVariant, selectedModifiers) =>
        set((state) => {
          const existing = state.cart.find((item) => {
            const matchProduct = item.product.id === product.id;
            const matchVariant = item.selectedVariant?.id === selectedVariant?.id;
            const itemMods = item.selectedModifiers || [];
            const chosenMods = selectedModifiers || [];
            const matchModifiers =
              itemMods.length === chosenMods.length &&
              itemMods.every((mod) => chosenMods.some((m) => m.id === mod.id));
            return matchProduct && matchVariant && matchModifiers;
          });

          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item === existing
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }

          const basePrice = product.sellingPrice;
          const varPriceDiff = selectedVariant?.priceDifference || 0;
          const modsPriceSum = (selectedModifiers || []).reduce((acc, m) => acc + m.price, 0);

          const customizedProduct = {
            ...product,
            sellingPrice: basePrice + varPriceDiff + modsPriceSum,
          };

          return {
            cart: [
              ...state.cart,
              {
                product: customizedProduct,
                quantity: 1,
                selectedVariant,
                selectedModifiers,
              },
            ],
          };
        }),

      removeFromCart: (productId, selectedVariant, selectedModifiers) =>
        set((state) => {
          const isSameItem = (item: CartItem) => {
            const matchProduct = item.product.id === productId;
            const matchVariant = item.selectedVariant?.id === selectedVariant?.id;
            const itemMods = item.selectedModifiers || [];
            const chosenMods = selectedModifiers || [];
            const matchModifiers =
              itemMods.length === chosenMods.length &&
              itemMods.every((mod) => chosenMods.some((m) => m.id === mod.id));
            return matchProduct && matchVariant && matchModifiers;
          };
          return {
            cart: state.cart.filter((item) => !isSameItem(item)),
          };
        }),

      updateCartQuantity: (productId, quantity, selectedVariant, selectedModifiers) =>
        set((state) => {
          const isSameItem = (item: CartItem) => {
            const matchProduct = item.product.id === productId;
            const matchVariant = item.selectedVariant?.id === selectedVariant?.id;
            const itemMods = item.selectedModifiers || [];
            const chosenMods = selectedModifiers || [];
            const matchModifiers =
              itemMods.length === chosenMods.length &&
              itemMods.every((mod) => chosenMods.some((m) => m.id === mod.id));
            return matchProduct && matchVariant && matchModifiers;
          };

          if (quantity <= 0) {
            return {
              cart: state.cart.filter((item) => !isSameItem(item)),
            };
          }

          return {
            cart: state.cart.map((item) =>
              isSameItem(item) ? { ...item, quantity } : item
            ),
          };
        }),

      updateCartItem: (productId, oldVariant, oldModifiers, newVariant, newModifiers, newQuantity) =>
        set((state) => {
          const isSameOldItem = (item: CartItem) => {
            const matchProduct = item.product.id === productId;
            const matchVariant = item.selectedVariant?.id === oldVariant?.id;
            const itemMods = item.selectedModifiers || [];
            const chosenMods = oldModifiers || [];
            return (
              matchProduct &&
              matchVariant &&
              itemMods.length === chosenMods.length &&
              itemMods.every((mod) => chosenMods.some((m) => m.id === mod.id))
            );
          };

          const oldItem = state.cart.find(isSameOldItem);
          if (!oldItem) return {};

          const qty = newQuantity !== undefined ? newQuantity : oldItem.quantity;
          const cartWithoutOld = state.cart.filter((item) => !isSameOldItem(item));

          const isSameNewItem = (item: CartItem) => {
            const matchProduct = item.product.id === productId;
            const matchVariant = item.selectedVariant?.id === newVariant?.id;
            const itemMods = item.selectedModifiers || [];
            const chosenMods = newModifiers || [];
            return (
              matchProduct &&
              matchVariant &&
              itemMods.length === chosenMods.length &&
              itemMods.every((mod) => chosenMods.some((m) => m.id === mod.id))
            );
          };

          const existingNewItem = cartWithoutOld.find(isSameNewItem);

          if (existingNewItem) {
            return {
              cart: cartWithoutOld.map((item) =>
                item === existingNewItem
                  ? { ...item, quantity: item.quantity + qty }
                  : item
              ),
            };
          }

          const originalProduct = state.products.find((p) => p.id === productId);
          if (!originalProduct) return {};

          const basePrice = originalProduct.sellingPrice;
          const varPriceDiff = newVariant?.priceDifference || 0;
          const modsPriceSum = (newModifiers || []).reduce((acc, m) => acc + m.price, 0);

          const customizedProduct = {
            ...originalProduct,
            sellingPrice: basePrice + varPriceDiff + modsPriceSum,
          };

          const newCartItem: CartItem = {
            product: customizedProduct,
            quantity: qty,
            selectedVariant: newVariant,
            selectedModifiers: newModifiers,
          };

          return {
            cart: [...cartWithoutOld, newCartItem],
          };
        }),

      clearCart: () => set({ cart: [], voucherDiscount: 0, selectedCustomer: null, activePromo: null, pointsToRedeem: 0 }),

      setVoucherDiscount: (amount) => set({ voucherDiscount: amount }),
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer, pointsToRedeem: 0 }),
      pointsToRedeem: 0,
      setPointsToRedeem: (points) => set({ pointsToRedeem: points }),
      setActivePromo: (promo) => set({ activePromo: promo }),

      // ── Customers ─────────────────────────────
      customers: mockCustomers,

      addCustomer: async (customer) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('customers').insert([
              {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email || null,
                points: customer.points,
                tier: customer.tier,
                total_spent: customer.totalSpent,
                joined_date: customer.joinedDate.toISOString(),
                owner_id: get().currentUser?.id || null,
              }
            ]);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error adding customer to Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ customers: [...state.customers, customer] }));
      },

      updateCustomer: async (customerId, updates) => {
        if (isSupabaseConfigured) {
          try {
            await supabase
              .from('customers')
              .update({
                name: updates.name,
                phone: updates.phone,
                email: updates.email || null,
                points: updates.points,
                tier: updates.tier,
                total_spent: updates.totalSpent,
              })
              .eq('id', customerId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error updating customer in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          customers: state.customers.map((c) => (c.id === customerId ? { ...c, ...updates } : c)),
        }));
      },

      deleteCustomer: async (customerId) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('customers').delete().eq('id', customerId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error deleting customer in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ customers: state.customers.filter((c) => c.id !== customerId) }));
      },

      // ── Promos ────────────────────────────────
      promos: mockPromos,

      addPromo: async (promo) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('promos').insert([
              {
                id: promo.id,
                code: promo.code,
                name: promo.name,
                type: promo.type,
                value: promo.value,
                min_purchase: promo.minPurchase,
                start_date: promo.startDate.toISOString(),
                end_date: promo.endDate.toISOString(),
                is_active: promo.isActive !== false,
                owner_id: get().currentUser?.id || null,
              }
            ]);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error adding promo to Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ promos: [...state.promos, promo] }));
      },

      updatePromo: async (promoId, updates) => {
        if (isSupabaseConfigured) {
          try {
            await supabase
              .from('promos')
              .update({
                code: updates.code,
                name: updates.name,
                type: updates.type,
                value: updates.value,
                min_purchase: updates.minPurchase,
                start_date: updates.startDate?.toISOString(),
                end_date: updates.endDate?.toISOString(),
                is_active: updates.isActive,
              })
              .eq('id', promoId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error updating promo in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          promos: state.promos.map((p) => (p.id === promoId ? { ...p, ...updates } : p)),
        }));
      },

      deletePromo: async (promoId) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('promos').delete().eq('id', promoId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error deleting promo in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ promos: state.promos.filter((p) => p.id !== promoId) }));
      },

      // ── Suppliers ─────────────────────────────
      suppliers: mockSuppliers,

      addSupplier: async (supplier) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('suppliers').insert([
              {
                id: supplier.id,
                name: supplier.name,
                contact_name: supplier.contactName || null,
                phone: supplier.phone,
                email: supplier.email || null,
                address: supplier.address,
                owner_id: get().currentUser?.id || null,
              }
            ]);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error adding supplier to Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ suppliers: [...state.suppliers, supplier] }));
      },

      updateSupplier: async (supplierId, updates) => {
        if (isSupabaseConfigured) {
          try {
            await supabase
              .from('suppliers')
              .update({
                name: updates.name,
                contact_name: updates.contactName || null,
                phone: updates.phone,
                email: updates.email || null,
                address: updates.address,
              })
              .eq('id', supplierId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error updating supplier in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === supplierId ? { ...s, ...updates } : s)),
        }));
      },

      deleteSupplier: async (supplierId) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('suppliers').delete().eq('id', supplierId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error deleting supplier from Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== supplierId) }));
      },

      // ── Purchase Orders ──────────────────────
      purchaseOrders: mockPurchaseOrders,

      addPurchaseOrder: async (po) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('purchase_orders').insert([
              {
                id: po.id,
                supplier_id: po.supplierId,
                supplier_name: po.supplierName,
                total_amount: po.totalAmount,
                status: po.status,
                date_created: po.dateCreated.toISOString(),
                outlet_id: po.outletId,
              }
            ]);

            const poItemsToInsert = po.items.map(item => ({
              po_id: po.id,
              product_id: item.productId,
              product_name: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              cost_price: item.costPrice,
              subtotal: item.subtotal,
              purchase_unit: item.purchaseUnit || null,
              conversion_rate: item.conversionRate || 1,
            }));

            await supabase.from('purchase_order_items').insert(poItemsToInsert);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error adding PO to Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ purchaseOrders: [po, ...state.purchaseOrders] }));
      },

      updatePurchaseOrder: async (poId, updates) => {
        if (isSupabaseConfigured) {
          try {
            const { error: poError } = await supabase
              .from('purchase_orders')
              .update({
                supplier_id: updates.supplierId,
                supplier_name: updates.supplierName,
                total_amount: updates.totalAmount,
                status: updates.status,
                date_received: updates.dateReceived?.toISOString(),
              })
              .eq('id', poId);
            
            if (poError) throw poError;

            if (updates.items) {
              const { error: deleteError } = await supabase
                .from('purchase_order_items')
                .delete()
                .eq('po_id', poId);
              
              if (deleteError) throw deleteError;

              const itemsToInsert = updates.items.map(item => ({
                po_id: poId,
                product_id: item.productId,
                product_name: item.productName,
                sku: item.sku,
                quantity: item.quantity,
                cost_price: item.costPrice,
                subtotal: item.subtotal,
                purchase_unit: item.purchaseUnit || null,
                conversion_rate: item.conversionRate || null,
              }));

              const { error: insertError } = await supabase
                .from('purchase_order_items')
                .insert(itemsToInsert);
              
              if (insertError) throw insertError;
            }

            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error updating PO in Supabase:', err);
            throw err;
          }
        }

        // Local Fallback
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((po) => (po.id === poId ? { ...po, ...updates } : po)),
        }));
      },

      receivePurchaseOrder: async (poId) => {
        if (isSupabaseConfigured) {
          try {
            const po = get().purchaseOrders.find((p) => p.id === poId);
            if (!po || po.status === 'Diterima') return;

            // 1. Update PO Status
            await supabase
              .from('purchase_orders')
              .update({
                status: 'Diterima',
                date_received: new Date().toISOString(),
              })
              .eq('id', poId);

            // 2. Adjust Product Stocks, write Stock Ledger (handling bulk unit conversions)
            for (const item of po.items) {
              const product = get().products.find(p => p.id === item.productId);
              if (product) {
                const multiplier = item.conversionRate || 1;
                const stockChange = item.quantity * multiplier;
                const stockAfter = product.stock + stockChange;
                const singleCostPrice = multiplier > 1 ? Math.round(item.costPrice / multiplier) : item.costPrice;

                await supabase.from('products').update({ 
                  stock: stockAfter,
                  purchase_price: singleCostPrice
                }).eq('id', item.productId);

                await supabase.from('stock_ledger').insert([
                  {
                    id: `LEDGER-${Date.now()}-${item.productId}-po`,
                    product_id: item.productId,
                    product_name: item.productName,
                    sku: item.sku,
                    timestamp: new Date().toISOString(),
                    change_type: 'Penerimaan PO',
                    quantity_change: stockChange,
                    stock_after: stockAfter,
                    reference_id: po.id,
                    created_by: get().currentUser?.name || 'Owner',
                    outlet_id: po.outletId,
                  }
                ]);
              }
            }

            // 3. Add Expense record
            await supabase.from('expenses').insert([
              {
                id: `EXP-${Date.now()}`,
                date: new Date().toISOString(),
                category: 'Pembelian Supplier PO',
                description: `Penerimaan PO ${po.id} dari ${po.supplierName}`,
                amount: po.totalAmount,
                outlet_id: po.outletId,
                has_receipt: true,
                created_by: get().currentUser?.name || 'Owner',
              }
            ]);

            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error receiving PO in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => {
          const po = state.purchaseOrders.find((p) => p.id === poId);
          if (!po || po.status === 'Diterima') return {};

          const updatedPOs = state.purchaseOrders.map((p) =>
            p.id === poId
              ? { ...p, status: 'Diterima' as const, dateReceived: new Date() }
              : p
          );

          const newLedgerEntries: StockLedgerEntry[] = [];
          const updatedProducts = state.products.map((p) => {
            const item = po.items.find((i) => i.productId === p.id);
            if (item) {
              const multiplier = item.conversionRate || 1;
              const stockChange = item.quantity * multiplier;
              const stockAfter = p.stock + stockChange;
              const singleCostPrice = multiplier > 1 ? Math.round(item.costPrice / multiplier) : item.costPrice;

              newLedgerEntries.push({
                id: `LEDGER-${Date.now()}-${item.productId}-po`,
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                timestamp: new Date(),
                changeType: 'Penerimaan PO',
                quantityChange: stockChange,
                stockAfter: stockAfter,
                referenceId: po.id,
                createdBy: state.currentUser?.name || 'Owner',
                outletId: po.outletId,
              });
              return { ...p, stock: stockAfter, purchasePrice: singleCostPrice };
            }
            return p;
          });

          const newExpense: Expense = {
            id: `EXP-${Date.now()}`,
            date: new Date(),
            category: 'Pembelian Supplier PO',
            description: `Penerimaan PO ${po.id} dari ${po.supplierName}`,
            amount: po.totalAmount,
            outletId: po.outletId,
            hasReceipt: true,
            createdBy: state.currentUser?.name || 'Owner',
          };

          return {
            purchaseOrders: updatedPOs,
            products: updatedProducts,
            expenses: [newExpense, ...state.expenses],
            stockLedger: [...newLedgerEntries, ...state.stockLedger],
          };
        });
      },

      // ── Transactions ─────────────────────────
      transactions: mockTransactions,

      addTransaction: async (transaction) => {
        if (isSupabaseConfigured) {
          try {
            // 1. Insert Transaction header
            const { error: txError } = await supabase.from('transactions').insert([
              {
                id: transaction.id,
                timestamp: transaction.timestamp.toISOString(),
                outlet_id: transaction.outletId,
                outlet_name: transaction.outletName,
                cashier_name: transaction.cashierName,
                subtotal: transaction.subtotal,
                tax_rate: transaction.taxRate,
                tax_amount: transaction.taxAmount,
                discount: transaction.discount,
                total_paid: transaction.totalPaid,
                payment_method: transaction.paymentMethod,
                status: transaction.status,
                notes: transaction.notes || null,
                customer_id: transaction.customerId || null,
                customer_name: transaction.customerName || null,
                promo_code: transaction.promoCode || null,
                member_discount: transaction.memberDiscount || 0,
                promo_discount: transaction.promoDiscount || 0,
                points_earned: transaction.pointsEarned || 0,
                points_redeemed: transaction.pointsRedeemed || 0,
                points_discount: transaction.pointsDiscount || 0,
                refunded_amount: transaction.refundedAmount || 0,
              }
            ]);

            if (txError) throw txError;

            // 2. Insert Transaction Items
            const itemsToInsert = transaction.items.map(item => ({
              transaction_id: transaction.id,
              product_id: item.productId,
              product_name: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              hpp: item.hpp,
              subtotal: item.subtotal,
              selected_variant: item.selectedVariant || null,
              selected_modifiers: item.selectedModifiers || null,
              refunded_qty: item.refundedQty || 0,
            }));

            const { error: itemsError } = await supabase.from('transaction_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            // 3. Deduct Stock & Write Stock Ledger
            for (const item of transaction.items) {
              const product = get().products.find(p => p.id === item.productId);
              if (product) {
                const stockAfter = Math.max(0, product.stock - item.quantity);
                await supabase.from('products').update({ stock: stockAfter }).eq('id', item.productId);

                await supabase.from('stock_ledger').insert([
                  {
                    id: `LEDGER-${Date.now()}-${item.productId}-sale`,
                    product_id: item.productId,
                    product_name: item.productName,
                    sku: item.sku,
                    timestamp: new Date().toISOString(),
                    change_type: 'Penjualan',
                    quantity_change: -item.quantity,
                    stock_after: stockAfter,
                    reference_id: transaction.id,
                    created_by: transaction.cashierName,
                    outlet_id: transaction.outletId,
                  }
                ]);
              }
            }

            // 4. Update Customer Points and Spent
            if (transaction.customerId) {
              const customer = get().customers.find(c => c.id === transaction.customerId);
              if (customer) {
                await supabase.from('customers').update({
                  points: Math.max(0, customer.points + (transaction.pointsEarned || 0) - (transaction.pointsRedeemed || 0)),
                  total_spent: customer.totalSpent + transaction.totalPaid,
                }).eq('id', transaction.customerId);
              }
            }

            // 5. Update Shift Expected cash if Cash transaction
            let updatedShift = get().activeShift;
            if (updatedShift && transaction.paymentMethod === 'Tunai') {
              const nextExpectedCash = updatedShift.expectedCash + transaction.totalPaid;
              await supabase
                .from('shift_sessions')
                .update({ expected_cash: nextExpectedCash })
                .eq('id', updatedShift.id);
            }

            set({ pointsToRedeem: 0 });
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error adding transaction in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => {
          let updatedCustomers = state.customers;
          if (transaction.customerId) {
            updatedCustomers = state.customers.map((c) => {
              if (c.id === transaction.customerId) {
                const netPoints = (transaction.pointsEarned || 0) - (transaction.pointsRedeemed || 0);
                return {
                  ...c,
                  points: Math.max(0, c.points + netPoints),
                  totalSpent: c.totalSpent + transaction.totalPaid,
                };
              }
              return c;
            });
          }

          const newLedgerEntries: StockLedgerEntry[] = [];
          const updatedProducts = state.products.map((p) => {
            const itemInCart = transaction.items.find((item) => item.productId === p.id);
            if (itemInCart) {
              const stockAfter = Math.max(0, p.stock - itemInCart.quantity);
              newLedgerEntries.push({
                id: `LEDGER-${Date.now()}-${itemInCart.productId}-sale`,
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                timestamp: new Date(),
                changeType: 'Penjualan',
                quantityChange: -itemInCart.quantity,
                stockAfter: stockAfter,
                referenceId: transaction.id,
                createdBy: transaction.cashierName,
                outletId: transaction.outletId,
              });
              return { ...p, stock: stockAfter };
            }
            return p;
          });

          let updatedShift = state.activeShift;
          if (updatedShift && transaction.paymentMethod === 'Tunai') {
            updatedShift = {
              ...updatedShift,
              expectedCash: updatedShift.expectedCash + transaction.totalPaid,
            };
          }

          return {
            transactions: [transaction, ...state.transactions],
            customers: updatedCustomers,
            products: updatedProducts,
            activeShift: updatedShift,
            stockLedger: [...newLedgerEntries, ...state.stockLedger],
            pointsToRedeem: 0,
          };
        });
      },

      refundTransactionItem: async (transactionId, productId, refundQty, notes) => {
        if (isSupabaseConfigured) {
          try {
            const tx = get().transactions.find((t) => t.id === transactionId);
            if (!tx) return;

            const item = tx.items.find((i) => i.productId === productId);
            if (!item) return;

            const alreadyRefunded = item.refundedQty || 0;
            const maxRefundable = item.quantity - alreadyRefunded;
            if (refundQty > maxRefundable) return;

            const refundAmount = item.unitPrice * refundQty;
            const newRefundedAmount = (tx.refundedAmount || 0) + refundAmount;
            const nextRefundedQty = alreadyRefunded + refundQty;

            // Check if transaction is fully returned
            const updatedItemsMapped = tx.items.map((i) =>
              i.productId === productId ? { ...i, refundedQty: nextRefundedQty } : i
            );
            const allItemsFullyRefunded = updatedItemsMapped.every(
              (i) => (i.refundedQty || 0) === i.quantity
            );
            const newStatus = allItemsFullyRefunded ? 'Diretur' : tx.status;

            // 1. Update Transaction item refunded_qty
            // Note: Since transaction_items id is serial, we query by transaction_id and product_id
            await supabase
              .from('transaction_items')
              .update({ refunded_qty: nextRefundedQty })
              .eq('transaction_id', transactionId)
              .eq('product_id', productId);

            // 2. Update Transaction header
            await supabase
              .from('transactions')
              .update({
                refunded_amount: newRefundedAmount,
                status: newStatus,
              })
              .eq('id', transactionId);

            // 3. Return product stock, write Stock Ledger
            const product = get().products.find(p => p.id === productId);
            if (product) {
              const stockAfter = product.stock + refundQty;
              await supabase.from('products').update({ stock: stockAfter }).eq('id', productId);

              await supabase.from('stock_ledger').insert([
                {
                  id: `LEDGER-${Date.now()}-${productId}-refund`,
                  product_id: productId,
                  product_name: product.name,
                  sku: product.sku,
                  timestamp: new Date().toISOString(),
                  change_type: 'Retur Penjualan',
                  quantity_change: refundQty,
                  stock_after: stockAfter,
                  reference_id: transactionId,
                  notes: notes || 'Retur produk transaksi',
                  created_by: get().currentUser?.name || 'Kasir',
                  outlet_id: tx.outletId,
                }
              ]);
            }

            // 4. Adjust active shift expected cash if Cash transaction
            let updatedShift = get().activeShift;
            if (updatedShift && tx.paymentMethod === 'Tunai') {
              const nextExpectedCash = Math.max(0, updatedShift.expectedCash - refundAmount);
              await supabase
                .from('shift_sessions')
                .update({ expected_cash: nextExpectedCash })
                .eq('id', updatedShift.id);
            }

            await get().initializeData();
            return;
          } catch (err) {
            console.error('Failed to refund transaction item in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => {
          const tx = state.transactions.find((t) => t.id === transactionId);
          if (!tx) return {};

          const item = tx.items.find((i) => i.productId === productId);
          if (!item) return {};

          const alreadyRefunded = item.refundedQty || 0;
          const maxRefundable = item.quantity - alreadyRefunded;
          if (refundQty > maxRefundable) return {};

          const updatedItems = tx.items.map((i) =>
            i.productId === productId
              ? { ...i, refundedQty: alreadyRefunded + refundQty }
              : i
          );

          const refundAmount = item.unitPrice * refundQty;
          const newRefundedAmount = (tx.refundedAmount || 0) + refundAmount;

          const allItemsFullyRefunded = updatedItems.every(
            (i) => (i.refundedQty || 0) === i.quantity
          );
          const newStatus = allItemsFullyRefunded ? ('Diretur' as const) : tx.status;

          const updatedTransaction = {
            ...tx,
            items: updatedItems,
            refundedAmount: newRefundedAmount,
            status: newStatus,
          };

          const updatedTransactions = state.transactions.map((t) =>
            t.id === transactionId ? updatedTransaction : t
          );

          let newLedgerEntry: StockLedgerEntry | null = null;
          const updatedProducts = state.products.map((p) => {
            if (p.id === productId) {
              const stockAfter = p.stock + refundQty;
              newLedgerEntry = {
                id: `LEDGER-${Date.now()}-${productId}-refund`,
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                timestamp: new Date(),
                changeType: 'Retur Penjualan',
                quantityChange: refundQty,
                stockAfter: stockAfter,
                referenceId: transactionId,
                notes: notes || 'Retur produk transaksi',
                createdBy: state.currentUser?.name || 'Kasir',
                outletId: tx.outletId,
              };
              return { ...p, stock: stockAfter };
            }
            return p;
          });

          let updatedShift = state.activeShift;
          if (updatedShift && tx.paymentMethod === 'Tunai') {
            updatedShift = {
              ...updatedShift,
              expectedCash: Math.max(0, updatedShift.expectedCash - refundAmount),
            };
          }

          return {
            transactions: updatedTransactions,
            products: updatedProducts,
            activeShift: updatedShift,
            stockLedger: newLedgerEntry 
              ? [newLedgerEntry, ...state.stockLedger] 
              : state.stockLedger,
          };
        });
      },

      // ── Expenses ─────────────────────────────
      expenses: mockExpenses,

      addExpense: async (expense) => {
        if (isSupabaseConfigured) {
          try {
            const payload: any = {
              id: expense.id,
              date: expense.date.toISOString(),
              category: expense.category,
              description: expense.description || null,
              amount: expense.amount,
              outlet_id: expense.outletId,
              has_receipt: expense.hasReceipt !== false,
              created_by: expense.createdBy || null,
            };
            if (expense.receiptUrl) {
              payload.receipt_url = expense.receiptUrl;
            }
            const { error } = await supabase.from('expenses').insert([payload]);
            if (error) {
              if (error.message && error.message.includes('column "receipt_url" does not exist')) {
                console.warn('Column "receipt_url" does not exist in expenses table. Retrying insert without receipt_url.');
                delete payload.receipt_url;
                const retry = await supabase.from('expenses').insert([payload]);
                if (retry.error) throw retry.error;
              } else {
                throw error;
              }
            }
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error adding expense to Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({ expenses: [expense, ...state.expenses] }));
      },

      deleteExpense: async (expenseId) => {
        if (isSupabaseConfigured) {
          try {
            await supabase.from('expenses').delete().eq('id', expenseId);
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error deleting expense in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== expenseId),
        }));
      },

      updateExpense: async (expenseId, updates) => {
        if (isSupabaseConfigured) {
          try {
            const payload: any = {
              date: updates.date ? new Date(updates.date).toISOString() : undefined,
              category: updates.category,
              description: updates.description,
              amount: updates.amount,
              outlet_id: updates.outletId,
              has_receipt: updates.hasReceipt,
              created_by: updates.createdBy,
            };
            if (updates.receiptUrl !== undefined) {
              payload.receipt_url = updates.receiptUrl;
            }
            const { error } = await supabase
              .from('expenses')
              .update(payload)
              .eq('id', expenseId);
            
            if (error) {
              if (error.message && error.message.includes('column "receipt_url" does not exist')) {
                console.warn('Column "receipt_url" does not exist in expenses table. Retrying update without receipt_url.');
                delete payload.receipt_url;
                const retry = await supabase
                  .from('expenses')
                  .update(payload)
                  .eq('id', expenseId);
                if (retry.error) throw retry.error;
              } else {
                throw error;
              }
            }
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error updating expense in Supabase:', err);
            throw err;
          }
        }

        // Local Fallback
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === expenseId ? { ...e, ...updates } : e
          ),
        }));
      },

      // ── Tax Settings ──────────────────────────
      taxSettings: mockTaxSettings,

      updateTaxSettings: async (settings) => {
        if (isSupabaseConfigured) {
          try {
            const ownerId = get().currentUser?.id;
            let rowId = 1;

            if (ownerId) {
              const { data, error } = await supabase
                .from('tax_settings')
                .select('id')
                .eq('owner_id', ownerId)
                .maybeSingle();
              
              if (!error && data?.id) {
                rowId = data.id;
              }
            }

            const payload: any = {
              id: rowId,
              ppn_enabled: settings.ppnEnabled,
              ppn_rate: settings.ppnRate,
              service_charge_enabled: settings.serviceChargeEnabled,
              service_charge_rate: settings.serviceChargeRate,
            };

            if (ownerId) {
              payload.owner_id = ownerId;
            }

            let { error: upsertError } = await supabase.from('tax_settings').upsert(payload);

            if (upsertError && upsertError.message.includes('column "owner_id" does not exist')) {
              console.warn('owner_id column missing in tax_settings. Retrying upsert without owner_id.');
              delete payload.owner_id;
              payload.id = 1; // Always force 1 for legacy global settings
              const retry = await supabase.from('tax_settings').upsert(payload);
              upsertError = retry.error;
            }

            if (upsertError) throw upsertError;
            await get().initializeData();
            return;
          } catch (err) {
            console.error('Error updating tax settings in Supabase:', err);
          }
        }

        // Local Fallback
        set((state) => ({
          taxSettings: { ...state.taxSettings, ...settings },
        }));
      },
    }),
    {
      name: 'kasirku-store-data',
    }
  )
);

// ─────────────────────────────────────────────
// Computed Selectors
// ─────────────────────────────────────────────
export const useCartTotal = () => {
  const { cart, voucherDiscount, taxSettings, selectedCustomer, activePromo, pointsToRedeem } = useStore();
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  let memberDiscountPercent = 0;
  if (selectedCustomer) {
    if (selectedCustomer.tier === 'Gold') memberDiscountPercent = 0.1;
    else if (selectedCustomer.tier === 'Silver') memberDiscountPercent = 0.05;
    else if (selectedCustomer.tier === 'Bronze') memberDiscountPercent = 0.02;
  }
  const memberDiscount = subtotal * memberDiscountPercent;

  let promoDiscount = 0;
  if (activePromo && subtotal >= activePromo.minPurchase && activePromo.isActive) {
    if (activePromo.type === 'Percentage') {
      promoDiscount = subtotal * (activePromo.value / 100);
    } else {
      promoDiscount = activePromo.value;
    }
  }

  const pointsDiscount = (pointsToRedeem || 0) * 100;
  const totalDiscount = memberDiscount + promoDiscount + voucherDiscount + pointsDiscount;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

  const taxAmount = taxSettings.ppnEnabled
    ? discountedSubtotal * taxSettings.ppnRate
    : 0;

  const total = discountedSubtotal + taxAmount;

  const pointsEarned = selectedCustomer ? Math.floor(total / 10000) : 0;

  return {
    subtotal,
    memberDiscount,
    promoDiscount,
    voucherDiscount,
    pointsDiscount,
    totalDiscount,
    taxAmount,
    total,
    pointsEarned,
  };
};
