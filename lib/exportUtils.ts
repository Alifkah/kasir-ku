// ─────────────────────────────────────────────
// KasirKu — Export Utilities (CSV & PDF)
// ─────────────────────────────────────────────

import * as XLSX from 'xlsx';
import { Transaction, Expense, Customer } from '@/types/pos';
import { formatIDR } from '@/data/mockData';

// ── Thermal Receipt Printer ──────────────────

/**
 * Print a single Transaction as a proper thermal receipt (58mm/80mm).
 * Opens a standalone HTML window and triggers the browser print dialog.
 */
export function printThermalReceipt(
  tx: Transaction,
  opts?: {
    outletAddress?: string;
    outletPhone?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    paperWidth?: '58mm' | '80mm';
  }
) {
  const w = opts?.paperWidth ?? '80mm';
  const header = opts?.receiptHeader ?? '★ KASIRKU POS ★';
  const footer = opts?.receiptFooter ?? 'Terima Kasih Atas Kunjungan Anda\nKasirKu POS System';
  const address = opts?.outletAddress ?? '';
  const phone = opts?.outletPhone ?? '';

  const itemRows = tx.items.map(item => {
    const netQty = item.quantity - (item.refundedQty || 0);
    const variantLine = item.selectedVariant
      ? `<div class="indent text-muted">Varian: ${item.selectedVariant.name}</div>`
      : '';
    const modLine = item.selectedModifiers && item.selectedModifiers.length > 0
      ? `<div class="indent text-muted">Mod: ${item.selectedModifiers.map((m: any) => m.name).join(', ')}</div>`
      : '';
    const refundedLine = (item.refundedQty ?? 0) > 0
      ? `<div class="indent text-muted">*Diretur: ${item.refundedQty} pcs</div>`
      : '';
    return `
      <div class="item-block">
        <div class="item-name">${item.productName}</div>
        ${variantLine}${modLine}
        <div class="item-row">
          <span>${netQty} x ${formatIDR(item.unitPrice)}</span>
          <span>${formatIDR(item.unitPrice * netQty)}</span>
        </div>
        ${refundedLine}
      </div>`;
  }).join('');

  const cashRows = tx.paymentMethod === 'Tunai' ? `
    <div class="row"><span>Tunai</span><span>${formatIDR((tx as any).cashReceived ?? tx.totalPaid)}</span></div>
    <div class="row bold"><span>Kembalian</span><span>${formatIDR(((tx as any).change) ?? 0)}</span></div>
  ` : '';

  const refundRow = tx.refundedAmount && tx.refundedAmount > 0
    ? `<div class="divider-dot"></div><div class="row text-red">*Retur: <span>- ${formatIDR(tx.refundedAmount)}</span></div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Struk #${tx.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: ${w} auto; margin: 3mm 4mm; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #000;
    background: #fff;
    width: ${w};
    padding: 0;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .text-muted { color: #555; }
  .text-red { color: #cc0000; font-weight: bold; }
  .header { text-align: center; margin-bottom: 6px; }
  .header .brand { font-size: 14px; font-weight: 900; letter-spacing: 1px; }
  .header .outlet { font-size: 11px; font-weight: bold; margin-top: 2px; }
  .header .sub { font-size: 10px; color: #555; margin-top: 1px; }
  .divider { border-top: 1px dashed #000; margin: 5px 0; }
  .divider-dot { border-top: 1px dotted #000; margin: 4px 0; }
  .meta { font-size: 10px; color: #333; margin: 4px 0; }
  .meta-row { display: flex; justify-content: space-between; }
  .item-block { margin-bottom: 4px; }
  .item-name { font-weight: bold; font-size: 11px; }
  .item-row { display: flex; justify-content: space-between; font-size: 10px; color: #333; padding-left: 8px; }
  .indent { padding-left: 8px; font-size: 9px; }
  .row { display: flex; justify-content: space-between; font-size: 11px; margin: 1px 0; }
  .row.bold { font-weight: bold; font-size: 12px; margin-top: 3px; }
  .total-box { margin-top: 4px; }
  .footer { text-align: center; font-size: 10px; color: #555; margin-top: 8px; white-space: pre-line; line-height: 1.5; }
  .payment-badge {
    display: inline-block;
    border: 1px solid #000;
    padding: 1px 8px;
    font-size: 10px;
    font-weight: bold;
    border-radius: 3px;
    margin: 4px auto;
  }
  @media print {
    body { width: ${w}; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">${header.replace(/\n/g, '<br/>')}</div>
    <div class="outlet">${tx.outletName}</div>
    ${address ? `<div class="sub">${address}</div>` : ''}
    ${phone ? `<div class="sub">Telp: ${phone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="meta">
    <div class="meta-row"><span>No. Struk</span><span>${tx.id}</span></div>
    <div class="meta-row"><span>Tanggal</span><span>${new Date(tx.timestamp).toLocaleString('id-ID')}</span></div>
    <div class="meta-row"><span>Kasir</span><span>${tx.cashierName}</span></div>
    ${tx.customerName ? `<div class="meta-row"><span>Pelanggan</span><span>${tx.customerName}</span></div>` : ''}
  </div>

  <div class="divider"></div>

  ${itemRows}

  <div class="divider"></div>

  <div class="total-box">
    <div class="row"><span>Subtotal</span><span>${formatIDR(tx.subtotal)}</span></div>
    ${tx.discount > 0 ? `<div class="row"><span>Diskon</span><span>- ${formatIDR(tx.discount)}</span></div>` : ''}
    ${tx.taxAmount > 0 ? `<div class="row"><span>PPN (${((tx.taxRate ?? 0) * 100).toFixed(0)}%)</span><span>${formatIDR(tx.taxAmount)}</span></div>` : ''}
    <div class="divider-dot"></div>
    <div class="row bold"><span>TOTAL</span><span>${formatIDR(tx.totalPaid)}</span></div>
    ${cashRows}
    ${refundRow}
  </div>

  <div class="divider"></div>

  <div class="center">
    <div class="payment-badge">${tx.paymentMethod}</div>
  </div>

  <div class="footer">${footer.replace(/\n/g, '<br/>')}</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  }
}

// ── CSV / Excel Export ──────────────────────

/**
 * Export an array of row objects to an XLSX file (opens as download).
 */
export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export transactions to Excel with a clean layout.
 */
export function exportTransactionsToExcel(transactions: Transaction[], filename = 'Riwayat_Transaksi') {
  const rows = transactions.map((tx) => ({
    'No. Transaksi': tx.id,
    'Tanggal': new Date(tx.timestamp).toLocaleString('id-ID'),
    'Outlet': tx.outletName,
    'Kasir': tx.cashierName,
    'Pelanggan': tx.customerName || '-',
    'Subtotal': tx.subtotal,
    'Diskon': tx.discount,
    'PPN': tx.taxAmount,
    'Total Bayar': tx.totalPaid,
    'Metode Bayar': tx.paymentMethod,
    'Status': tx.status,
    'Jumlah Item': tx.items.reduce((sum, i) => sum + i.quantity, 0),
    'Kode Promo': tx.promoCode || '-',
    'Retur (Rp)': tx.refundedAmount || 0,
  }));
  exportToExcel(rows, filename, 'Transaksi');
}

/**
 * Export expenses to Excel.
 */
export function exportExpensesToExcel(expenses: Expense[], filename = 'Laporan_Pengeluaran') {
  const rows = expenses.map((exp) => ({
    'ID': exp.id,
    'Tanggal': new Date(exp.date).toLocaleString('id-ID'),
    'Kategori': exp.category,
    'Deskripsi': exp.description,
    'Jumlah (Rp)': exp.amount,
    'Ada Bukti': exp.hasReceipt ? 'Ya' : 'Tidak',
    'Dibuat Oleh': exp.createdBy,
  }));
  exportToExcel(rows, filename, 'Pengeluaran');
}

/**
 * Export top product summary to Excel.
 */
export function exportTopProductsToExcel(
  transactions: Transaction[],
  outletId: string,
  filename = 'Laporan_Produk_Terlaris'
) {
  // Build product stats
  const productMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
  transactions
    .filter(tx => tx.outletId === outletId && tx.status !== 'Gagal')
    .forEach(tx => {
      tx.items.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
        }
        const netQty = item.quantity - (item.refundedQty || 0);
        productMap[item.productId].qty += netQty;
        productMap[item.productId].revenue += item.unitPrice * netQty;
        productMap[item.productId].profit += (item.unitPrice - item.hpp) * netQty;
      });
    });

  const rows = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((p, i) => ({
      'Rank': i + 1,
      'Nama Produk': p.name,
      'Jumlah Terjual': p.qty,
      'Pendapatan Kotor (Rp)': p.revenue,
      'Laba Kotor (Rp)': p.profit,
    }));

  exportToExcel(rows, filename, 'Produk Terlaris');
}

// ── PDF Print Helper ──────────────────────────

/**
 * Build an HTML string for a print-ready transaction list and open it
 * in a new window for the user to trigger the browser print dialog.
 */
export function printTransactionsPDF(transactions: Transaction[], title = 'Riwayat Transaksi KasirKu') {
  const totalRevenue = transactions.reduce((s, tx) => {
    if (tx.status === 'Gagal') return s;
    return s + (tx.totalPaid - (tx.refundedAmount || 0));
  }, 0);

  const rows = transactions.map(tx => `
    <tr>
      <td>${tx.id}</td>
      <td>${new Date(tx.timestamp).toLocaleString('id-ID')}</td>
      <td>${tx.cashierName}</td>
      <td>${tx.items.length} item</td>
      <td>${tx.paymentMethod}</td>
      <td style="text-align:right">${formatIDR(tx.totalPaid)}</td>
      <td>${tx.status}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    h1 { font-size: 16px; font-weight: 800; color: #4f46e5; margin-bottom: 4px; }
    .meta { font-size: 10px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #4f46e5; color: white; padding: 8px 10px; text-align: left; font-size: 10px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    tr:nth-child(even) { background: #f8fafc; }
    .total-row { font-weight: 700; font-size: 11px; border-top: 2px solid #4f46e5; }
    .total-row td { padding-top: 10px; }
    .summary { margin-bottom: 12px; display: flex; gap: 24px; }
    .summary-box { background: #f1f5f9; border-radius: 8px; padding: 10px 16px; }
    .summary-box .val { font-size: 14px; font-weight: 800; color: #4f46e5; }
    .summary-box .lbl { font-size: 9px; color: #64748b; margin-top: 2px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>📊 ${title}</h1>
  <p class="meta">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
  <div class="summary">
    <div class="summary-box">
      <div class="val">${transactions.length}</div>
      <div class="lbl">Total Transaksi</div>
    </div>
    <div class="summary-box">
      <div class="val">${formatIDR(totalRevenue)}</div>
      <div class="lbl">Total Pendapatan</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>No. Transaksi</th>
        <th>Tanggal</th>
        <th>Kasir</th>
        <th>Item</th>
        <th>Metode Bayar</th>
        <th style="text-align:right">Total</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="5"><strong>TOTAL PENDAPATAN (Transaksi Berhasil)</strong></td>
        <td style="text-align:right"><strong>${formatIDR(totalRevenue)}</strong></td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

/**
 * Print reports summary as PDF.
 */
export function printReportsPDF(
  outletName: string,
  totalRevenue: number,
  totalHpp: number,
  totalGrossProfit: number,
  totalExpenses: number,
  netProfit: number,
  txCount: number,
  topProducts: Array<{ name: string; qty: number; revenue: number; profit: number }>,
  expenseBreakdown?: Array<{ category: string; count: number; percentage: number; amount: number }>
) {
  const productRows = topProducts
    .slice(0, 20)
    .map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.qty}</td>
        <td style="text-align:right">${formatIDR(p.revenue)}</td>
        <td style="text-align:right">${formatIDR(p.profit)}</td>
      </tr>
    `).join('');

  const expenseRows = expenseBreakdown && expenseBreakdown.length > 0
    ? expenseBreakdown.map(e => `
      <tr>
        <td>${e.category}</td>
        <td>${e.count}x</td>
        <td>${e.percentage}%</td>
        <td style="text-align:right">${formatIDR(e.amount)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" style="text-align:center">Tidak ada data pengeluaran terdaftar</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Keuangan — ${outletName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    h1 { font-size: 16px; font-weight: 800; color: #4f46e5; margin-bottom: 2px; }
    h2 { font-size: 12px; font-weight: 700; margin: 20px 0 8px; color: #334155; }
    .meta { font-size: 10px; color: #64748b; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .card { background: #f1f5f9; border-radius: 8px; padding: 10px 14px; }
    .card .val { font-size: 14px; font-weight: 800; color: #4f46e5; }
    .card .lbl { font-size: 9px; color: #64748b; margin-top: 2px; }
    .card.profit .val { color: #16a34a; }
    .card.loss .val { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #4f46e5; color: white; padding: 7px 10px; text-align: left; font-size: 10px; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    tr:nth-child(even) { background: #f8fafc; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>📊 Laporan Keuangan — ${outletName}</h1>
  <p class="meta">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
 
  <h2>Ringkasan Keuangan</h2>
  <div class="grid">
    <div class="card"><div class="val">${formatIDR(totalRevenue)}</div><div class="lbl">Total Pendapatan</div></div>
    <div class="card"><div class="val">${txCount}</div><div class="lbl">Total Transaksi</div></div>
    <div class="card"><div class="val">${formatIDR(totalHpp)}</div><div class="lbl">Total HPP</div></div>
    <div class="card profit"><div class="val">${formatIDR(totalGrossProfit)}</div><div class="lbl">Laba Kotor</div></div>
    <div class="card loss"><div class="val">${formatIDR(totalExpenses)}</div><div class="lbl">Total Pengeluaran</div></div>
    <div class="card ${netProfit >= 0 ? 'profit' : 'loss'}"><div class="val">${formatIDR(netProfit)}</div><div class="lbl">Laba Bersih</div></div>
  </div>

  ${expenseBreakdown && expenseBreakdown.length > 0 ? `
  <h2>Beban Pengeluaran per Kategori</h2>
  <table>
    <thead>
      <tr>
        <th>Kategori Pengeluaran</th><th>Jumlah Transaksi</th><th>Persentase</th><th style="text-align:right">Total Beban</th>
      </tr>
    </thead>
    <tbody>${expenseRows}</tbody>
  </table>
  ` : ''}

  <h2>Top Produk Terlaris</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Nama Produk</th><th>Qty Terjual</th><th style="text-align:right">Pendapatan</th><th style="text-align:right">Laba Kotor</th>
      </tr>
    </thead>
    <tbody>${productRows}</tbody>
  </table>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

/**
 * Export customers to Excel.
 */
export function exportCustomersToExcel(customers: Customer[], filename = 'Daftar_Pelanggan') {
  const rows = customers.map((c) => ({
    'ID Member': c.id,
    'Nama': c.name,
    'Telepon': c.phone,
    'Email': c.email || '-',
    'Tier': c.tier,
    'Poin': c.points,
    'Total Belanja': c.totalSpent,
    'Tanggal Bergabung': new Date(c.joinedDate).toLocaleDateString('id-ID'),
  }));
  exportToExcel(rows, filename, 'Pelanggan');
}

/**
 * Export customers to CSV.
 */
export function exportCustomersToCSV(customers: Customer[], filename = 'Daftar_Pelanggan') {
  const rows = customers.map((c) => ({
    'ID Member': c.id,
    'Nama': c.name,
    'Telepon': c.phone,
    'Email': c.email || '-',
    'Tier': c.tier,
    'Poin': c.points,
    'Total Belanja': c.totalSpent,
    'Tanggal Bergabung': new Date(c.joinedDate).toLocaleDateString('id-ID'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Print a cashier shift session summary (Z-Report) as a thermal receipt (58mm/80mm).
 * Opens a standalone HTML window and triggers the browser print dialog.
 */
export function printShiftReport(
  shift: any,
  transactions: Transaction[],
  opts?: {
    businessName?: string;
    outletName?: string;
    paperWidth?: '58mm' | '80mm';
  }
) {
  const w = opts?.paperWidth ?? '80mm';
  const bizName = opts?.businessName ?? '★ KASIRKU POS ★';
  const outlet = opts?.outletName ?? 'Outlet Utama';

  // Filter transactions within shift timeframe and matching this cashier name
  const shiftTransactions = transactions.filter(tx => {
    const txTime = new Date(tx.timestamp).getTime();
    const startTime = new Date(shift.startTime).getTime();
    const endTime = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();
    return txTime >= startTime && txTime <= endTime && tx.cashierName === shift.cashierName;
  });

  const totalTransactionsCount = shiftTransactions.length;
  const totalSalesAmount = shiftTransactions.reduce((sum, tx) => sum + (tx.status === 'Sukses' ? tx.totalPaid : 0), 0);
  const totalRefundAmount = shiftTransactions.reduce((sum, tx) => sum + (tx.refundedAmount || 0), 0);
  
  // Sales by payment method
  const cashSales = shiftTransactions
    .filter(tx => tx.paymentMethod === 'Tunai' && tx.status === 'Sukses')
    .reduce((sum, tx) => sum + tx.totalPaid, 0);

  const debitSales = shiftTransactions
    .filter(tx => tx.paymentMethod === 'Debit/Kredit' && tx.status === 'Sukses')
    .reduce((sum, tx) => sum + tx.totalPaid, 0);

  const qrisSales = shiftTransactions
    .filter(tx => tx.paymentMethod === 'QRIS' && tx.status === 'Sukses')
    .reduce((sum, tx) => sum + tx.totalPaid, 0);

  const startStr = new Date(shift.startTime).toLocaleString('id-ID');
  const endStr = shift.endTime 
    ? new Date(shift.endTime).toLocaleString('id-ID')
    : 'Aktif (Belum Tutup)';

  const expected = shift.expectedCash;
  const actual = shift.actualCash ?? 0;
  const diff = shift.difference ?? (actual - expected);

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Rekap Shift #${shift.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: ${w} auto; margin: 3mm 4mm; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #000;
    background: #fff;
    width: ${w};
    padding: 0;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .header { text-align: center; margin-bottom: 6px; }
  .header .brand { font-size: 14px; font-weight: 900; letter-spacing: 1px; }
  .header .outlet { font-size: 11px; font-weight: bold; margin-top: 2px; }
  .divider { border-top: 1px dashed #000; margin: 5px 0; }
  .divider-dot { border-top: 1px dotted #000; margin: 4px 0; }
  .meta { font-size: 10px; color: #333; margin: 4px 0; }
  .meta-row { display: flex; justify-content: space-between; }
  .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
  .row.bold { font-weight: bold; font-size: 12px; margin-top: 4px; }
  .row.red { color: #cc0000; font-weight: bold; }
  .row.green { color: #008800; font-weight: bold; }
  .footer { text-align: center; font-size: 9px; color: #555; margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px; }
  .sig-box { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; }
  .sig-line { border-top: 1px solid #000; width: 45%; margin-top: 35px; text-align: center; padding-top: 2px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">${bizName}</div>
    <div class="outlet">${outlet}</div>
    <div class="bold" style="margin-top: 4px; font-size: 11px;">LAPORAN SHIFT KASIR (Z-REPORT)</div>
  </div>

  <div class="divider"></div>

  <div class="meta">
    <div class="meta-row"><span>ID Shift</span><span>${shift.id}</span></div>
    <div class="meta-row"><span>Kasir</span><span>${shift.cashierName}</span></div>
    <div class="meta-row"><span>Waktu Buka</span><span>${startStr}</span></div>
    <div class="meta-row"><span>Waktu Tutup</span><span>${endStr}</span></div>
  </div>

  <div class="divider"></div>

  <div class="bold" style="font-size: 10px; margin-bottom: 2px;">RINCIAN KAS (LACI UANG):</div>
  <div class="row"><span>Modal Tunai Awal</span><span>${formatIDR(shift.initialCash)}</span></div>
  <div class="row"><span>Penjualan Tunai</span><span>+ ${formatIDR(cashSales)}</span></div>
  <div class="divider-dot"></div>
  <div class="row bold"><span>Ekspektasi Uang Laci</span><span>${formatIDR(expected)}</span></div>
  <div class="row"><span>Uang Fisik Laci</span><span>${shift.endTime ? formatIDR(actual) : '—'}</span></div>
  <div class="divider-dot"></div>
  
  ${shift.endTime ? `
    <div class="row bold ${diff === 0 ? 'green' : diff > 0 ? 'green' : 'red'}">
      <span>Selisih Kas</span>
      <span>${diff === 0 ? 'Cocok (Rp 0)' : diff > 0 ? `Surplus +${formatIDR(diff)}` : `Defisit -${formatIDR(Math.abs(diff))}`}</span>
    </div>
  ` : ''}

  <div class="divider"></div>

  <div class="bold" style="font-size: 10px; margin-bottom: 2px;">RINGKASAN PENJUALAN:</div>
  <div class="row"><span>Total Transaksi</span><span>${totalTransactionsCount} x</span></div>
  <div class="row"><span>Total Omset (Sukses)</span><span>${formatIDR(totalSalesAmount)}</span></div>
  <div class="row"><span>Total Retur</span><span>- ${formatIDR(totalRefundAmount)}</span></div>

  <div class="divider-dot"></div>
  <div class="bold" style="font-size: 9px; margin-top: 4px; margin-bottom: 2px;">METODE PEMBAYARAN:</div>
  <div class="row"><span>Tunai</span><span>${formatIDR(cashSales)}</span></div>
  <div class="row"><span>Debit/Kredit</span><span>${formatIDR(debitSales)}</span></div>
  <div class="row"><span>QRIS</span><span>${formatIDR(qrisSales)}</span></div>

  ${shift.notes ? `
    <div class="divider"></div>
    <div class="bold" style="font-size: 10px;">Catatan:</div>
    <div style="font-size: 10px; font-style: italic; white-space: pre-line; margin-top: 2px;">${shift.notes}</div>
  ` : ''}

  <div class="sig-box">
    <div class="sig-line">Kasir<br/>(${shift.cashierName})</div>
    <div class="sig-line">Supervisor / Owner<br/>(............... )</div>
  </div>

  <div class="footer">
    KasirKu POS System<br/>
    Dicetak pada: ${new Date().toLocaleString('id-ID')}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  }
}

