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
  const [tampilkanDibatalkan, setTampilkanDibatalkan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editNamaId, setEditNamaId] = useState<number | null>(null);
  const [editNamaValue, setEditNamaValue] = useState("");
  const [konfirmasiBatalId, setKonfirmasiBatalId] = useState<number | null>(
    null
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: trxData } = await supabase
      .from("transaksi")
      .select("*")
      .order("tanggal", { ascending: false })
      .range(0, 9999);
    const { data: detData } = await supabase
      .from("transaksi_detail")
      .select("*")
      .range(0, 9999);
    const { data: produkData } = await supabase
      .from("produk")
      .select("*")
      .range(0, 9999);

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

  function mulaiEditNama(r: Row) {
    setEditNamaId(r.id);
    setEditNamaValue(r.nama_pembeli);
  }

  async function simpanNama(id: number) {
    if (!editNamaValue.trim()) return;
    setSaving(true);
    await supabase
      .from("transaksi")
      .update({ nama_pembeli: editNamaValue.trim() })
      .eq("id", id);
    setSaving(false);
    setEditNamaId(null);
    load();
  }

  async function batalkanTransaksi(r: Row) {
    setSaving(true);
    // Kembalikan stok tiap item ke produk (jumlahkan dulu kalau ada produk
    // yang sama muncul di lebih dari satu baris item dalam transaksi ini)
    const qtyPerProduk = new Map<number, number>();
    for (const d of r.details) {
      qtyPerProduk.set(d.produk_id, (qtyPerProduk.get(d.produk_id) ?? 0) + d.qty);
    }
    for (const [produkId, qty] of qtyPerProduk) {
      const { data: p } = await supabase
        .from("produk")
        .select("stok")
        .eq("id", produkId)
        .single();
      if (p) {
        await supabase
          .from("produk")
          .update({ stok: p.stok + qty })
          .eq("id", produkId);
      }
    }
    // Hapus catatan pelunasan kalau transaksi ini pernah dilunasi
    await supabase.from("pelunasan_dp").delete().eq("transaksi_id", r.id);
    // Tandai dibatalkan (riwayat tetap ada, tidak dihapus)
    await supabase
      .from("transaksi")
      .update({ dibatalkan: true, dibatalkan_pada: new Date().toISOString() })
      .eq("id", r.id);
    setSaving(false);
    setKonfirmasiBatalId(null);
    load();
  }

  const filtered = rows.filter((r) => {
    if (!tampilkanDibatalkan && r.dibatalkan) return false;
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

      <div className="mb-2 flex gap-2">
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

      <label className="mb-4 flex items-center gap-1.5 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={tampilkanDibatalkan}
          onChange={(e) => setTampilkanDibatalkan(e.target.checked)}
        />
        Tampilkan transaksi yang dibatalkan
      </label>

      {loading && <div className="text-sm text-gray-400">Memuat...</div>}

      {!loading &&
        filtered.map((r) => (
          <div
            key={r.id}
            className={`mb-2 rounded-md border p-2.5 ${
              r.dibatalkan
                ? "border-gray-200 bg-gray-50 opacity-60"
                : "border-gray-200"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">{r.no_transaksi}</span>
              {r.dibatalkan ? (
                <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
                  Dibatalkan
                </span>
              ) : (
                <span
                  className={`rounded px-2 py-0.5 text-[11px] ${
                    r.status_pembayaran === "Lunas"
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {r.status_pembayaran}
                </span>
              )}
            </div>

            {editNamaId === r.id ? (
              <div className="mb-1.5 flex gap-1.5">
                <input
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={editNamaValue}
                  onChange={(e) => setEditNamaValue(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => simpanNama(r.id)}
                  disabled={saving}
                  className="rounded-md bg-blue-700 px-2.5 text-xs text-white"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setEditNamaId(null)}
                  className="rounded-md border border-gray-300 px-2.5 text-xs"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span>
                  {r.nama_pembeli} &middot; {formatRp(r.total)}
                </span>
                {!r.dibatalkan && (
                  <button
                    onClick={() => mulaiEditNama(r)}
                    className="text-[11px] text-blue-600"
                  >
                    Edit nama
                  </button>
                )}
              </div>
            )}

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

            {!r.dibatalkan && konfirmasiBatalId !== r.id && (
              <button
                onClick={() => setKonfirmasiBatalId(r.id)}
                className="mt-2 text-[11px] text-red-600"
              >
                Batalkan transaksi
              </button>
            )}

            {konfirmasiBatalId === r.id && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                <div className="mb-2 text-[11px] text-red-700">
                  Yakin batalkan transaksi ini? Stok akan dikembalikan
                  otomatis, dan status pelunasan (kalau ada) akan direset.
                  Transaksi tetap tersimpan dengan status &quot;Dibatalkan&quot;.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setKonfirmasiBatalId(null)}
                    className="flex-1 rounded-md border border-gray-300 bg-white py-1.5 text-xs"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => batalkanTransaksi(r)}
                    disabled={saving}
                    className="flex-1 rounded-md bg-red-600 py-1.5 text-xs text-white disabled:opacity-50"
                  >
                    {saving ? "Memproses..." : "Ya, batalkan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

      {!loading && filtered.length === 0 && (
        <div className="text-sm text-gray-400">Tidak ada transaksi.</div>
      )}
    </div>
  );
}
