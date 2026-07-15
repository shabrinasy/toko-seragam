-- Jalankan ini di Supabase SQL Editor SEKALI SAJA
-- Menambah kolom nominal_dilunasi tanpa menghapus data yang sudah ada

alter table pelunasan_dp
  add column if not exists nominal_dilunasi integer not null default 0;
