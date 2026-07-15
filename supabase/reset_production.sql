-- =====================================================================
-- RESET DATABASE UNTUK PRODUCTION -- HAPUS SEMUA DATA
-- =====================================================================
-- PERINGATAN: Script ini menghapus SELURUH data (semua produk, semua
-- transaksi, semua pelunasan, semua riwayat penerimaan barang) secara
-- PERMANEN dan TIDAK BISA di-undo. Struktur tabel tetap ada, cuma
-- isinya dikosongkan lagi dari nol.
--
-- Pastikan kamu benar-benar sudah selesai testing sebelum menjalankan
-- ini. Kalau ragu, backup dulu lewat menu Database -> Backups di
-- Supabase (tersedia meskipun di plan Free, retensi harian terbatas).
--
-- Jalankan di Supabase SQL Editor -> New query -> Run.
-- =====================================================================

truncate table
  transaksi_detail,
  pelunasan_dp,
  penerimaan_barang,
  transaksi,
  produk
restart identity cascade;

-- Reset nomor urut transaksi (TRX-0001, TRX-0002, dst) balik ke awal
alter sequence transaksi_no_seq restart with 1;

-- Setelah ini dijalankan, semua tabel kosong dan siap diisi data asli
-- lewat aplikasi (mulai dari Master Produk).
