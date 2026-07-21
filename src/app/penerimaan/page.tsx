"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, Produk, Transaksi, TransaksiDetail, fetchAllPages } from "@/lib/supabase";
import SearchableSelect from "@/components/SearchableSelect";

type PoBaris = TransaksiDetail & { transaksi: Transaksi };

export default function PenerimaanPage() {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [produkId, setProdukId] = useState<number | null>(null);
  const [jumlahMasuk, setJumlahMasuk] = useState(1);
  const [poBaris, setPoBaris] = useState<PoBaris[]>([]);
  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPages<Produk>((from, to) =>
      supabase.from("produk").select("*").order("nama").range(from, to)
    ).then((data) => {
      setProdukList(data);
      if (data.length > 0) setProdukId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (produkId == null) return;
    loadPo(produkId);
  }, [produkId]);

  async function loadPo(pId: number) {
    const details = await fetchAllPages<TransaksiDetail>((from, to) =>
      supabase
        .from("transaksi_detail")
        .select("*")
        .eq("produk_id", pId)
        .eq("status_barang", "PO")
        .range(from, to)
    );
    const transaksiList = await fetchAllPages<Transaksi>((from, to) =>
      supabase
        .from("transaksi")
        .select("*")
        .eq("dibatalkan", false)
        .range(from, to)
    );

    const rows: PoBaris[] = details
      .map((d) => {
        const t = transaksiList.find((tt) => tt.id === d.transaksi_id);
        return t ? { ...d, transaksi: t } : null;
      })
      .filter((r): r is PoBaris => r !== null)
      .sort(
        (a, b) =>
          new Date(a.transaksi.tanggal).getTime() -
          new Date(b.transaksi.tanggal).getTime()
      );
    setPoBaris(rows);
  }

  const produk = produkList.find((p) => p.id === produkId);

  // Simulasi alokasi FIFO untuk ditampilkan sebelum disimpan
  const alokasi = useMemo(() => {
    let sisa = jumlahMasuk;
    const terpenuhi: PoBaris[] = [];
    for (const row of poBaris) {
      if (sisa >= row.qty) {
        terpenuhi.push(row);
        sisa -= row.qty;
      } else {
        break;
      }
    }
    return { terpenuhi, sisaTambahStok: sisa };
  }, [poBaris, jumlahMasuk]);

  async function konfirmasi() {
    if (!produk) return;
    setSaving(true);
    setPesan(null);
    try {
      await supabase.from("penerimaan_barang").insert({
        produk_id: produk.id,
        jumlah_masuk: jumlahMasuk,
      });

      for (const row of alokasi.terpenuhi) {
        await supabase
          .from("transaksi_detail")
          .update({ status_barang: "Tersedia" })
          .eq("id", row.id);
      }

      // Stok selalu bertambah sejumlah barang masuk secara PENUH -- stok
      // yang minus itu sendiri sudah merepresentasikan utang PO, jadi
      // menambah stok dengan jumlah_masuk apa adanya otomatis "melunasi"
      // utang tersebut sekaligus menyisakan kelebihan kalau ada.
      await supabase
        .from("produk")
        .update({ stok: produk.stok + jumlahMasuk })
        .eq("id", produk.id);

      setPesan("Barang masuk berhasil dicatat.");
      setJumlahMasuk(1);
      loadPo(produk.id);
      const data = await fetchAllPages<Produk>((from, to) =>
        supabase.from("produk").select("*").order("nama").range(from, to)
      );
      setProdukList(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-medium">Penerimaan barang</h1>

      <label className="mb-1 block text-xs text-gray-500">Produk</label>
      <SearchableSelect
        className="mb-1 w-full rounded-md border border-gray-300 px-3 py-2 text-left text-sm"
        value={produkId != null ? String(produkId) : ""}
        onChange={(v) => setProdukId(Number(v))}
        placeholder="Pilih produk"
        options={produkList.map((p) => ({
          value: String(p.id),
          label: `${p.nama} \u00b7 ${p.gender} \u00b7 ${p.ukuran}`,
        }))}
      />
      {produk && (
        <div className="mb-4 text-xs text-amber-700">
          Stok saat ini: {produk.stok}
          {produk.stok < 0 &&
            ` (${Math.abs(produk.stok)} unit di-PO-kan)`}
        </div>
      )}

      <label className="mb-1 block text-xs text-gray-500">
        Jumlah barang masuk
      </label>
      <div className="mb-4 flex items-center gap-2">
        <button
          className="h-9 w-9 rounded-md border border-gray-300"
          onClick={() => setJumlahMasuk((q) => Math.max(1, q - 1))}
        >
          -
        </button>
        <input
          className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-center text-sm"
          value={jumlahMasuk}
          onChange={(e) => setJumlahMasuk(Number(e.target.value) || 1)}
        />
        <button
          className="h-9 w-9 rounded-md border border-gray-300"
          onClick={() => setJumlahMasuk((q) => q + 1)}
        >
          +
        </button>
      </div>

      <div className="mb-2 text-xs text-gray-500">
        Akan dialokasikan ke (FIFO):
      </div>
      {poBaris.length === 0 && (
        <div className="mb-3 text-xs text-gray-400">
          Tidak ada transaksi PO untuk produk ini.
        </div>
      )}
      {poBaris.map((row) => {
        const terpenuhi = alokasi.terpenuhi.some((r) => r.id === row.id);
        return (
          <div
            key={row.id}
            className="mb-1.5 flex items-center justify-between rounded-md border border-gray-200 px-2.5 py-2"
          >
            <div>
              <div className="text-sm font-medium">
                {row.transaksi.no_transaksi} &middot; {row.transaksi.nama_pembeli}
              </div>
              <div className="text-[11px] text-gray-400">
                {new Date(row.transaksi.tanggal).toLocaleDateString("id-ID")}{" "}
                &middot; butuh {row.qty} unit
              </div>
            </div>
            <span className={terpenuhi ? "text-green-600" : "text-gray-300"}>
              ✓
            </span>
          </div>
        );
      })}

      {alokasi.sisaTambahStok > 0 && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
          Sisa {alokasi.sisaTambahStok} unit menambah stok produk ini
        </div>
      )}

      {pesan && <div className="mb-3 text-sm text-green-700">{pesan}</div>}

      <button
        onClick={konfirmasi}
        disabled={saving || !produk}
        className="w-full rounded-md bg-blue-700 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Konfirmasi barang masuk"}
      </button>
    </div>
  );
}
