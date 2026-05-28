-- ─────────────────────────────────────────────────────────────
-- KASIRKU SQL MIGRATION — LOYALTY POINTS REDEMPTION SUPPORT
-- ─────────────────────────────────────────────────────────────
-- Jalankan query berikut di SQL Editor pada Supabase Dashboard Anda.
-- ─────────────────────────────────────────────────────────────

-- 1. Tambahkan kolom points_redeemed ke tabel transactions jika belum ada
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;

-- 2. Tambahkan kolom points_discount ke tabel transactions jika belum ada
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS points_discount NUMERIC DEFAULT 0;

COMMENT ON COLUMN transactions.points_redeemed IS 'Jumlah poin member yang ditukarkan dalam transaksi';
COMMENT ON COLUMN transactions.points_discount IS 'Total potongan belanja rupiah dari penukaran poin';
