"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  supabase,
  Transaksi,
  TransaksiDetail,
  PelunasanDp,
  Produk,
} from "@/lib/supabase";

const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0, 10);

type TrxRow = Transaksi & { details: TransaksiDetail[] };

export default function LaporanPage() {
  const [tanggal, setTanggal] = useState(today());
  const [trxHariIni, setTrxHariIni] = useState<TrxRow[]>([]);
  const [pelunasanHariIni, setPelunasanHariIni] = useState<
    (PelunasanDp & { transaksi: Transaksi })[]
  >([]);
  const [produkMap, setProdukMap] = useState<Map<number, Produk>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [tanggal]);

  function namaProduk(produkId: number) {
    return produkMap.get(produkId)?.nama ?? "Produk";
  }

  async function load() {
    setLoading(true);
    const start = `${tanggal}T00:00:00`;
    const end = `${tanggal}T23:59:59`;

    const { data: produkData } = await supabase.from("produk").select("*");
    setProdukMap(new Map((produkData ?? []).map((p) => [p.id, p])));

    const { data: trxData } = await supabase
      .from("transaksi")
      .select("*")
      .gte("tanggal", start)
      .lte("tanggal", end)
      .eq("dibatalkan", false);
    const { data: detData } = await supabase.from("transaksi_detail").select("*");

    const rows: TrxRow[] = (trxData ?? []).map((t) => ({
      ...t,
      details: (detData ?? []).filter((d) => d.transaksi_id === t.id),
    }));
    setTrxHariIni(rows);

    const { data: pelData } = await supabase
      .from("pelunasan_dp")
      .select("*")
      .gte("tanggal_lunas", start)
      .lte("tanggal_lunas", end);
    const { data: allTrx } = await supabase.from("transaksi").select("*");
    const pelRows = (pelData ?? [])
      .map((p) => {
        const t = (allTrx ?? []).find((tt) => tt.id === p.transaksi_id);
        return t ? { ...p, transaksi: t } : null;
      })
      .filter((r): r is PelunasanDp & { transaksi: Transaksi } => r !== null);
    setPelunasanHariIni(pelRows);

    setLoading(false);
  }

  const totalLunas = useMemo(
    () =>
      trxHariIni
        .filter((t) => t.status_pembayaran === "Lunas")
        .reduce((s, t) => s + t.total, 0),
    [trxHariIni]
  );
  const totalDpDiterima = useMemo(
    () =>
      trxHariIni
        .filter((t) => t.status_pembayaran === "DP")
        .reduce((s, t) => s + t.nominal_dp, 0),
    [trxHariIni]
  );
  const totalPelunasan = useMemo(
    () => pelunasanHariIni.reduce((s, p) => s + p.nominal_dilunasi, 0),
    [pelunasanHariIni]
  );
  const grandTotal = totalLunas + totalDpDiterima + totalPelunasan;

  function exportExcel() {
    const ringkasan = [
      ["Laporan harian", tanggal],
      [],
      ["Penjualan lunas", totalLunas],
      ["DP diterima", totalDpDiterima],
      ["Pelunasan DP", totalPelunasan],
      ["Total kas masuk", grandTotal],
      [],
    ];

    // Satu baris per ITEM (bukan per transaksi) supaya status Tersedia/PO
    // tiap barang kelihatan jelas satu-satu, tidak digabung jadi satu teks.
    const rincianHeader = [
      "No transaksi",
      "Nama pembeli",
      "Produk",
      "Ukuran",
      "Qty",
      "Subtotal",
      "Status bayar",
      "Status barang",
    ];
    const rincianRows: (string | number)[][] = [];
    trxHariIni.forEach((t) => {
      t.details.forEach((d) => {
        rincianRows.push([
          t.no_transaksi,
          t.nama_pembeli,
          namaProduk(d.produk_id),
          d.ukuran,
          d.qty,
          d.subtotal,
          t.status_pembayaran,
          d.status_barang,
        ]);
      });
    });

    const pelunasanHeader = [
      "No transaksi",
      "Nama pembeli",
      "Nominal dilunasi",
    ];
    const pelunasanRows = pelunasanHariIni.map((p) => [
      p.transaksi.no_transaksi,
      p.transaksi.nama_pembeli,
      p.nominal_dilunasi,
    ]);

    const sheetData = [
      ...ringkasan,
      ["Rincian item terjual"],
      rincianHeader,
      ...rincianRows,
      [],
      ["Pelunasan DP"],
      pelunasanHeader,
      ...pelunasanRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Harian");
    XLSX.writeFile(wb, `Laporan_Harian_${tanggal}.xlsx`);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-medium">Laporan harian</h1>
      </div>
      <input
        type="date"
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={tanggal}
        onChange={(e) => setTanggal(e.target.value)}
      />

      <div className="mb-2 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-gray-100 p-2.5">
          <div className="text-[11px] text-gray-500">Penjualan lunas</div>
          <div className="text-base font-medium">{formatRp(totalLunas)}</div>
        </div>
        <div className="rounded-md bg-gray-100 p-2.5">
          <div className="text-[11px] text-gray-500">DP diterima</div>
          <div className="text-base font-medium">{formatRp(totalDpDiterima)}</div>
        </div>
        <div className="rounded-md bg-gray-100 p-2.5">
          <div className="text-[11px] text-gray-500">Pelunasan DP</div>
          <div className="text-base font-medium">{formatRp(totalPelunasan)}</div>
        </div>
        <div className="rounded-md bg-blue-50 p-2.5">
          <div className="text-[11px] text-blue-700">Total kas masuk</div>
          <div className="text-base font-medium text-blue-700">
            {formatRp(grandTotal)}
          </div>
        </div>
      </div>

      <div className="my-3 text-xs text-gray-500">
        Rincian transaksi ({trxHariIni.length})
      </div>
      {loading && <div className="text-sm text-gray-400">Memuat...</div>}
      {!loading &&
        trxHariIni.map((t) => (
          <div key={t.id} className="mb-2 rounded-md border border-gray-200 p-2">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">
                {t.no_transaksi} &middot; {t.nama_pembeli}
              </span>
              <span className="font-medium">{formatRp(t.total)}</span>
            </div>
            <div className="space-y-1">
              {t.details.map((d) => (
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

      <button
        onClick={exportExcel}
        className="mt-4 w-full rounded-md bg-blue-700 py-2.5 text-sm font-medium text-white"
      >
        Export ke Excel
      </button>
    </div>
  );
}
