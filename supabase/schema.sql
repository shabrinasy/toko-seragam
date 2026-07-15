-- Jalankan file ini di Supabase Dashboard -> SQL Editor -> New query -> Run

create table produk (
  id bigint generated always as identity primary key,
  nama text not null,
  ukuran text not null,
  kategori text,
  gender text not null check (gender in ('Putra', 'Putri')),
  harga_default integer not null check (harga_default > 0),
  stok integer not null default 0,
  created_at timestamptz not null default now()
);

create table transaksi (
  id bigint generated always as identity primary key,
  no_transaksi text not null unique,
  tanggal timestamptz not null default now(),
  nama_pembeli text not null,
  status_pembayaran text not null check (status_pembayaran in ('Lunas', 'DP')),
  nominal_dp integer not null default 0,
  sisa_tagihan integer not null default 0,
  total integer not null default 0
);

create table transaksi_detail (
  id bigint generated always as identity primary key,
  transaksi_id bigint not null references transaksi(id) on delete cascade,
  produk_id bigint not null references produk(id),
  ukuran text not null,
  qty integer not null check (qty > 0),
  harga integer not null check (harga > 0),
  subtotal integer not null,
  status_barang text not null check (status_barang in ('Tersedia', 'PO'))
);

create table pelunasan_dp (
  id bigint generated always as identity primary key,
  transaksi_id bigint not null unique references transaksi(id) on delete cascade,
  tanggal_lunas timestamptz not null default now(),
  nominal_dilunasi integer not null default 0
);

create table penerimaan_barang (
  id bigint generated always as identity primary key,
  produk_id bigint not null references produk(id),
  tanggal timestamptz not null default now(),
  jumlah_masuk integer not null check (jumlah_masuk > 0)
);

-- Nomor transaksi otomatis format TRX-0001, TRX-0002, dst
create sequence if not exists transaksi_no_seq;

create or replace function generate_no_transaksi()
returns text as $$
  select 'TRX-' || lpad(nextval('transaksi_no_seq')::text, 4, '0');
$$ language sql;

-- Aktifkan Row Level Security + izinkan akses penuh untuk 1 kasir (tanpa login)
-- Catatan: ini cocok untuk versi awal 1 kasir/1 device. Kalau nanti multi-user,
-- kebijakan ini perlu diganti pakai auth.uid().
alter table produk enable row level security;
alter table transaksi enable row level security;
alter table transaksi_detail enable row level security;
alter table pelunasan_dp enable row level security;
alter table penerimaan_barang enable row level security;

create policy "allow all produk" on produk for all using (true) with check (true);
create policy "allow all transaksi" on transaksi for all using (true) with check (true);
create policy "allow all transaksi_detail" on transaksi_detail for all using (true) with check (true);
create policy "allow all pelunasan_dp" on pelunasan_dp for all using (true) with check (true);
create policy "allow all penerimaan_barang" on penerimaan_barang for all using (true) with check (true);

-- Contoh data awal (boleh dihapus)
insert into produk (nama, ukuran, kategori, gender, harga_default, stok) values
  ('Kemeja putih', 'M', 'SD Umum', 'Putri', 75000, 8),
  ('Celana abu', 'L', 'SD Umum', 'Putra', 90000, 0);
