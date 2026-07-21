import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Ambil SEMUA baris dari sebuah query, walaupun jumlahnya melebihi batas
 * "Max Rows" yang dikonfigurasi di project Supabase (defaultnya sering
 * 1000). Ini mengambil data bertahap per 1000 baris sampai benar-benar
 * habis, jadi tidak pernah kepotong walau data sudah sangat banyak.
 */
export async function fetchAllPages<T>(
  build: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  let all: T[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const chunk = data ?? [];
    all = all.concat(chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export type Produk = {
  id: number;
  nama: string;
  ukuran: string;
  kategori: string | null;
  gender: "Putra" | "Putri" | "-";
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
  dibatalkan: boolean;
  dibatalkan_pada: string | null;
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
  menjadi_lunas: boolean;
};

export type PenerimaanBarang = {
  id: number;
  produk_id: number;
  tanggal: string;
  jumlah_masuk: number;
};
