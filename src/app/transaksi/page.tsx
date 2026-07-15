"use client";

import { useEffect, useState } from "react";
import { supabase, Transaksi, TransaksiDetail, Produk } from "@/lib/supabase";

const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

type Row = Transaksi & { details: TransaksiDetail[] };

export default function RiwayatPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [produkMap, setProdukMap] = useState<Map<number, Produk>>(new Map());
  const [search, setSearch] = useState("");
  const [filterBayar, setFilterBayar] = useState<"Semua" | "Lunas" | "DP">(
    "Semua"
  );
  const [filterBarang, setFilterBarang] = useState<"Semua" | "Tersedia" | "PO">(
    "Semua"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: trxData } = await supabase
      .from("transaksi")
      .select("*")
      .order("tanggal", { ascending: false });
    const { data: detData } = await supabase.from("transaksi_detail").select("*");
    const { data: produkData } = await supabase.from("produk").select("*");

    setProdukMap(new Map((produkData ?? []).map((p) => [p.id, p])));

    const combined: Row[] = (trxData ?? []).map((t) => ({
      ...t,
      details: (detData ?? []).filter((d) => d.transaksi_id === t.id),
    }));
    setRows(combined);
    setLoading(false);
  }

  function namaProduk(produkId: number) {
    return produkMap.get(produkId)?.nama ?? "Produk";
  }

  const filtered = rows.filter((r) => {
    if (search && !r.nama_pembeli.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterBayar !== "Semua" && r.status_pembayaran !== filterBayar)
      return false;
    if (filterBarang !== "Semua") {
      const statuses = r.details.map((d) => d.status_barang);
      if (!statuses.includes(filterBarang)) return false;
    }
    return true;
  });

  return (
    <div>
      <h1 className="mb-3 text-lg font-medium">Riwayat transaksi</h1>

      <input
        className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        placeholder="Cari nama pembeli"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-4 flex gap-2">
        <select
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs"
          value={filterBayar}
          onChange={(e) => setFilterBayar(e.target.value as typeof filterBayar)}
        >
          <option value="Semua">Semua bayar</option>
          <option value="Lunas">Lunas</option>
          <option value="DP">DP</option>
        </select>
        <select
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs"
          value={filterBarang}
          onChange={(e) => setFilterBarang(e.target.value as typeof filterBarang)}
        >
          <option value="Semua">Semua barang</option>
          <option value="Tersedia">Tersedia</option>
          <option value="PO">PO</option>
        </select>
      </div>

      {loading && <div className="text-sm text-gray-400">Memuat...</div>}

      {!loading &&
        filtered.map((r) => (
          <div
            key={r.id}
            className="mb-2 rounded-md border border-gray-200 p-2.5"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">{r.no_transaksi}</span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] ${
                  r.status_pembayaran === "Lunas"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {r.status_pembayaran}
              </span>
            </div>
            <div className="mb-1.5 text-sm">
              {r.nama_pembeli} &middot; {formatRp(r.total)}
            </div>

            <div className="space-y-1">
              {r.details.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs"
                >
                  <span className="text-gray-700">
                    {namaProduk(d.produk_id)} {d.ukuran} &times;{d.qty}
                  </span>
                  <span
                    className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                      d.status_barang === "Tersedia"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {d.status_barang}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

      {!loading && filtered.length === 0 && (
        <div className="text-sm text-gray-400">Tidak ada transaksi.</div>
      )}
    </div>
  );
}
