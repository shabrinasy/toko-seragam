import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Produk = {
  id: number;
  nama: string;
  ukuran: string;
  kategori: string | null;
  gender: "Putra" | "Putri";
  harga_default: number;
  stok: number;
};

export type Transaksi = {
  id: number;
  no_transaksi: string;
  tanggal: string;
  nama_pembeli: string;
  status_pembayaran: "Lunas" | "DP";
  nominal_dp: number;
  sisa_tagihan: number;
  total: number;
};

export type TransaksiDetail = {
  id: number;
  transaksi_id: number;
  produk_id: number;
  ukuran: string;
  qty: number;
  harga: number;
  subtotal: number;
  status_barang: "Tersedia" | "PO";
};

export type PelunasanDp = {
  id: number;
  transaksi_id: number;
  tanggal_lunas: string;
  nominal_dilunasi: number;
};

export type PenerimaanBarang = {
  id: number;
  produk_id: number;
  tanggal: string;
  jumlah_masuk: number;
};
