# Toko Seragam — Aplikasi Pencatatan Transaksi

Aplikasi web (PWA) untuk mencatat transaksi penjualan seragam, termasuk DP dan PO otomatis saat stok kurang.

## Fitur

- Transaksi baru (multi-item, status Lunas/DP, status barang Tersedia/PO otomatis)
- Pelunasan DP
- Penerimaan barang (alokasi otomatis ke transaksi PO, FIFO)
- Riwayat transaksi (filter & pencarian)
- Laporan harian (export ke Excel)
- Master data produk (dengan gender & stok)

## 1. Setup Supabase (database)

1. Buka https://supabase.com, buat akun, lalu buat project baru.
2. Buka menu **SQL Editor** di dashboard Supabase, buat query baru, lalu copy-paste seluruh isi file `supabase/schema.sql` dari folder ini. Klik **Run**.
   Ini akan membuat semua tabel (`produk`, `transaksi`, `transaksi_detail`, `pelunasan_dp`, `penerimaan_barang`) beserta 2 contoh produk.
3. Buka menu **Settings -> API**, catat:
   - `Project URL`
   - `anon public` key

## 2. Setup environment lokal

1. Pastikan sudah install Node.js versi 18 ke atas.
2. Di folder project ini, jalankan:
   ```bash
   npm install
   ```
3. Copy file `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
4. Buka `.env.local`, isi dengan `Project URL` dan `anon public key` dari Supabase (langkah 1.3).

## 3. Jalankan di lokal

```bash
npm run dev
```

Buka http://localhost:3000 di browser. Coba semua fitur dulu sebelum deploy.

## 4. Deploy ke Vercel (gratis)

1. Push folder project ini ke repository GitHub baru.
2. Buka https://vercel.com, Sign up/login pakai akun GitHub yang sama.
3. Klik **New Project**, pilih repository yang baru di-push.
4. Di bagian **Environment Variables**, tambahkan 2 variabel yang sama seperti di `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Klik **Deploy**. Setelah selesai, Vercel akan kasih URL publik aplikasi kamu.

## 5. Pakai di HP

Buka URL aplikasi dari Vercel di browser HP, lalu pilih menu browser "Add to Home Screen" (Chrome Android) supaya muncul sebagai ikon aplikasi di layar utama.

## Struktur folder penting

```
supabase/schema.sql          -> Jalankan ini di Supabase SQL Editor
src/lib/supabase.ts          -> Koneksi ke database
src/app/transaksi/baru/      -> Halaman transaksi baru
src/app/transaksi/           -> Halaman riwayat transaksi
src/app/pelunasan/           -> Halaman pelunasan DP
src/app/penerimaan/          -> Halaman penerimaan barang
src/app/produk/              -> Halaman master produk
src/app/laporan/             -> Halaman laporan harian + export Excel
```

## Catatan

- Versi ini didesain untuk 1 kasir / 1 device (belum ada login multi-user).
- Kalau nanti butuh multi-kasir, tinggal tambahkan Supabase Auth dan ubah kebijakan RLS di `schema.sql`.
