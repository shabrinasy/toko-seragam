-- =====================================================================
-- DATA DUMMY UNTUK MENJALANKAN TEST CASE (Test_Case.pdf, TC-01 s.d TC-25)
-- =====================================================================
-- Prasyarat: schema.sql dan migrasi_nominal_dilunasi.sql sudah dijalankan.
-- Jalankan seluruh file ini SEKALI di Supabase SQL Editor (New query -> Run).
-- Aman dijalankan meski database sudah ada 2 contoh produk bawaan
-- schema.sql (Kemeja putih, Celana abu) -- tidak akan bentrok.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. MASTER PRODUK -- dipakai untuk TC-01, TC-02, TC-05, TC-06, TC-07,
--    TC-16, TC-17, TC-18, TC-19
-- ---------------------------------------------------------------------

insert into produk (nama, ukuran, kategori, gender, harga_default, stok) values
  -- Stok banyak -> TC-01 (transaksi lunas biasa) dan TC-02 (item pertama)
  ('Kemeja Sekolah Putih', 'M', 'SD Umum', 'Putri', 150000, 20),
  -- Produk kedua, beda dari di atas -> TC-02 (item kedua, multi-item)
  -- juga dipakai sebagai "item A" (stok cukup) di TC-07
  ('Celana Panjang Abu', 'L', 'SD Umum', 'Putra', 90000, 15),
  -- Stok tersisa 1 -> TC-05 (qty melebihi stok yang tersisa sebagian)
  -- juga dipakai sebagai "item B" (stok kurang) di TC-07
  ('Rok Span Abu', 'M', 'SD Umum', 'Putri', 85000, 1),
  -- Stok 0 -> TC-06 (item langsung PO sejak awal, tanpa perlu qty besar)
  ('Training Pack', 'L', 'SD Umum', 'Putra', 120000, 0),
  -- Stok positif, tidak ada PO -> TC-16 (penerimaan barang tanpa alokasi)
  ('Topi Sekolah', 'S', 'SD Umum', 'Putri', 35000, 10);

-- Cara uji cepat:
-- TC-01: Transaksi Baru -> pilih "Kemeja Sekolah Putih", qty 1-5, status Lunas -> simpan
-- TC-02: Transaksi Baru -> tambah "Kemeja Sekolah Putih" + "Celana Panjang Abu" -> simpan
-- TC-03/TC-04: transaksi apa saja, coba status DP dengan nominal DP < total (harus bisa)
--              dan nominal DP > total (harus ditolak)
-- TC-05: pilih "Rok Span Abu" (stok 1), input qty 3 -> status barang harus otomatis PO
-- TC-06: pilih "Training Pack" (stok 0), qty berapa saja -> harus langsung PO
-- TC-07: 1 transaksi, tambah "Celana Panjang Abu" (Tersedia) + "Rok Span Abu" qty 2 (PO)
-- TC-08/TC-09: coba simpan tanpa item / tanpa nama pembeli, harus ditolak
-- TC-17/TC-18: buka Master Produk -> Tambah produk baru, coba tanpa isi gender
-- TC-19: edit harga "Kemeja Sekolah Putih" setelah TC-01 dijalankan, cek transaksi
--        TC-01 yang lama harganya tidak berubah


-- ---------------------------------------------------------------------
-- 2. TRANSAKSI PO LAMA -- untuk TC-13, TC-14, TC-15 (Penerimaan Barang)
-- ---------------------------------------------------------------------

do $$
declare
  v_produk_x bigint;
  v_produk_y bigint;
  v_produk_z bigint;
  v_trx bigint;
begin
  -- --- Produk X: butuh 3 unit total dari 2 transaksi PO -> TC-13 ---
  insert into produk (nama, ukuran, kategori, gender, harga_default, stok)
  values ('Baju Batik Sekolah', 'M', 'SD Umum', 'Putri', 130000, -3)
  returning id into v_produk_x;

  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now() - interval '6 days', 'Bu Rina (dummy TC-13a)', 'DP', 100000, 160000, 260000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_x, 'M', 2, 130000, 260000, 'PO');

  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now() - interval '4 days', 'Pak Joko (dummy TC-13b)', 'DP', 50000, 80000, 130000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_x, 'M', 1, 130000, 130000, 'PO');

  -- --- Produk Y: butuh 1 unit, barang masuk nanti 5 -> TC-14 (ada sisa) ---
  insert into produk (nama, ukuran, kategori, gender, harga_default, stok)
  values ('Jaket Sekolah', 'L', 'SD Umum', 'Putra', 175000, -1)
  returning id into v_produk_y;

  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now() - interval '3 days', 'Bu Nita (dummy TC-14)', 'DP', 75000, 100000, 175000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_y, 'L', 1, 175000, 175000, 'PO');

  -- --- Produk Z: 2 transaksi PO beda tanggal, buat cek urutan FIFO -> TC-15 ---
  insert into produk (nama, ukuran, kategori, gender, harga_default, stok)
  values ('Dasi Sekolah', 'S', 'SD Umum', 'Putra', 25000, -4)
  returning id into v_produk_z;

  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now() - interval '10 days', 'Pak Adi (dummy TC-15-lama)', 'DP', 20000, 30000, 50000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_z, 'S', 2, 25000, 50000, 'PO');

  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now() - interval '2 days', 'Bu Sinta (dummy TC-15-baru)', 'DP', 20000, 30000, 50000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_z, 'S', 2, 25000, 50000, 'PO');
end $$;

-- Cara uji:
-- TC-13: buka Penerimaan Barang -> pilih "Baju Batik Sekolah" -> input jumlah masuk 3
--        -> kedua transaksi (Bu Rina & Pak Joko) harus Tersedia, stok balik ke 0
-- TC-14: pilih "Jaket Sekolah" -> input jumlah masuk 5 -> transaksi Bu Nita Tersedia,
--        sisa 4 unit menambah stok jadi 4
-- TC-15: pilih "Dasi Sekolah" -> input jumlah masuk 2 -> HANYA transaksi Pak Adi
--        (lebih lama) yang jadi Tersedia, punya Bu Sinta (lebih baru) tetap PO
-- TC-16: pilih "Topi Sekolah" (stok 10, tanpa PO) -> input jumlah masuk berapa saja
--        -> langsung nambah stok, tanpa daftar alokasi


-- ---------------------------------------------------------------------
-- 3. TRANSAKSI "HARI INI" -- untuk TC-20, TC-21, TC-22 (Riwayat Transaksi)
--    dan TC-23, TC-24 (Laporan Harian)
-- ---------------------------------------------------------------------

do $$
declare
  v_produk_kemeja bigint;
  v_produk_celana bigint;
  v_produk_topi bigint;
  v_trx bigint;
begin
  select id into v_produk_kemeja from produk where nama = 'Kemeja Sekolah Putih' limit 1;
  select id into v_produk_celana from produk where nama = 'Celana Panjang Abu' limit 1;
  select id into v_produk_topi from produk where nama = 'Topi Sekolah' limit 1;

  -- Transaksi Lunas hari ini, item Tersedia
  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now(), 'Ibu Sari (dummy uji)', 'Lunas', 0, 0, 150000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_kemeja, 'M', 1, 150000, 150000, 'Tersedia');

  -- Transaksi DP hari ini, item Tersedia -> untuk cek "DP diterima" di laporan
  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now(), 'Pak Budi (dummy uji)', 'DP', 80000, 100000, 180000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_celana, 'L', 2, 90000, 180000, 'Tersedia');

  -- Transaksi Lunas hari ini, nama mirip "Sari" juga -> buat uji pencarian TC-22
  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now(), 'Sari Wulandari (dummy uji)', 'Lunas', 0, 0, 35000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_topi, 'S', 1, 35000, 35000, 'Tersedia');

  -- Transaksi lama (DP) yang baru DILUNASI hari ini -> untuk cek "Pelunasan DP"
  -- di laporan hari ini terpisah dari "DP diterima" hari ini (TC-23)
  insert into transaksi (no_transaksi, tanggal, nama_pembeli, status_pembayaran, nominal_dp, sisa_tagihan, total)
  values (generate_no_transaksi(), now() - interval '9 days', 'Bu Wati (dummy uji pelunasan)', 'Lunas', 50000, 0, 150000)
  returning id into v_trx;
  insert into transaksi_detail (transaksi_id, produk_id, ukuran, qty, harga, subtotal, status_barang)
  values (v_trx, v_produk_kemeja, 'M', 1, 150000, 150000, 'Tersedia');
  insert into pelunasan_dp (transaksi_id, tanggal_lunas, nominal_dilunasi)
  values (v_trx, now(), 100000);
end $$;

-- Cara uji:
-- TC-20: Riwayat Transaksi -> filter status pembayaran = DP -> harus muncul
--        "Pak Budi (dummy uji)" dan transaksi DP lain, tidak muncul yang Lunas
-- TC-21: filter status barang = PO -> harus muncul transaksi dummy TC-13/14/15
--        (yang belum diterima barangnya), tidak muncul transaksi hari ini (Tersedia)
-- TC-22: ketik "Sari" di pencarian -> harus muncul "Ibu Sari (dummy uji)" DAN
--        "Sari Wulandari (dummy uji)" (2 hasil)
-- TC-23: buka Laporan Harian untuk HARI INI -> cek:
--        Penjualan lunas   = 150.000 + 35.000 = Rp185.000
--        DP diterima       = Rp80.000 (dari Pak Budi)
--        Pelunasan DP      = Rp100.000 (dari Bu Wati)
--        Total kas masuk   = Rp365.000
-- TC-24: klik Export ke Excel pada laporan hari ini, cocokkan angka di file
--        dengan yang tampil di layar
-- TC-25: ganti tanggal laporan ke tanggal jauh di masa lalu/depan yang belum
--        ada transaksinya -> semua nilai harus Rp0, tanpa error
