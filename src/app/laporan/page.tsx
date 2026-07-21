"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  supabase,
  Transaksi,
  TransaksiDetail,
  PelunasanDp,
  Produk,
  fetchAllPages,
} from "@/lib/supabase";

const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0, 10);

type TrxRow = Transaksi & { details: TransaksiDetail[] };

type PoGroupRow = {
  nama: string;
  gender: string;
  ukuran: string;
  totalQty: number;
  jumlahTransaksi: number;
  pembeli: string[];
};

export default function LaporanPage() {
  const [tanggal, setTanggal] = useState(today());
  const [trxHariIni, setTrxHariIni] = useState<TrxRow[]>([]);
  const [pelunasanHariIni, setPelunasanHariIni] = useState<
    (PelunasanDp & { transaksi: Transaksi })[]
  >([]);
  const [produkMap, setProdukMap] = useState<Map<number, Produk>>(new Map());
  const [loading, setLoading] = useState(true);
  const [poGroups, setPoGroups] = useState<PoGroupRow[]>([]);
  const [loadingPo, setLoadingPo] = useState(true);
  const [tab, setTab] = useState<"harian" | "po">("harian");

  useEffect(() => {
    loadPoGroups();
  }, []);

  async function loadPoGroups() {
    setLoadingPo(true);
    const produkData = await fetchAllPages<Produk>((from, to) =>
      supabase.from("produk").select("*").range(from, to)
    );
    const produkById = new Map(produkData.map((p) => [p.id, p]));

    const poDetail = await fetchAllPages<TransaksiDetail>((from, to) =>
      supabase
        .from("transaksi_detail")
        .select("*")
        .eq("status_barang", "PO")
        .range(from, to)
    );
    const transaksiAktif = await fetchAllPages<Transaksi>((from, to) =>
      supabase
        .from("transaksi")
        .select("*")
        .eq("dibatalkan", false)
        .range(from, to)
    );
    const transaksiById = new Map(transaksiAktif.map((t) => [t.id, t]));

    const groups = new Map<string, PoGroupRow>();
    poDetail.forEach((d) => {
      const t = transaksiById.get(d.transaksi_id);
      if (!t) return; // transaksinya sudah dibatalkan, jangan dihitung

      const p = produkById.get(d.produk_id);
      const nama = p?.nama ?? "Produk";
      const gender = p?.gender ?? "-";
      const ukuran = d.ukuran;
      const key = `${nama}|${gender}|${ukuran}`;

      const existing = groups.get(key);
      if (existing) {
        existing.totalQty += d.qty;
        existing.jumlahTransaksi += 1;
        if (!existing.pembeli.includes(t.nama_pembeli)) {
          existing.pembeli.push(t.nama_pembeli);
        }
      } else {
        groups.set(key, {
          nama,
          gender,
          ukuran,
          totalQty: d.qty,
          jumlahTransaksi: 1,
          pembeli: [t.nama_pembeli],
        });
      }
    });

    const rows = Array.from(groups.values()).sort(
      (a, b) =>
        a.nama.localeCompare(b.nama) ||
        a.gender.localeCompare(b.gender) ||
        a.ukuran.localeCompare(b.ukuran)
    );
    setPoGroups(rows);
    setLoadingPo(false);
  }

  function exportPoExcel() {
    const header = [
      "Nama produk",
      "Gender",
      "Ukuran",
      "Total qty PO",
      "Jumlah transaksi",
      "Pembeli",
    ];
    const rows = poGroups.map((g) => [
      g.nama,
      g.gender,
      g.ukuran,
      g.totalQty,
      g.jumlahTransaksi,
      g.pembeli.join(", "),
    ]);
    const sheetData = [
      ["Daftar barang masih PO", new Date().toLocaleDateString("id-ID")],
      [],
      header,
      ...rows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar PO");
    XLSX.writeFile(
      wb,
      `Daftar_PO_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

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

    const produkData = await fetchAllPages<Produk>((from, to) =>
      supabase.from("produk").select("*").range(from, to)
    );
    setProdukMap(new Map(produkData.map((p) => [p.id, p])));

    const trxData = await fetchAllPages<Transaksi>((from, to) =>
      supabase
        .from("transaksi")
        .select("*")
        .gte("tanggal", start)
        .lte("tanggal", end)
        .eq("dibatalkan", false)
        .range(from, to)
    );
    const detData = await fetchAllPages<TransaksiDetail>((from, to) =>
      supabase.from("transaksi_detail").select("*").range(from, to)
    );

    const rows: TrxRow[] = trxData.map((t) => ({
      ...t,
      details: detData.filter((d) => d.transaksi_id === t.id),
    }));
    setTrxHariIni(rows);

    const pelData = await fetchAllPages<PelunasanDp>((from, to) =>
      supabase
        .from("pelunasan_dp")
        .select("*")
        .gte("tanggal_lunas", start)
        .lte("tanggal_lunas", end)
        .range(from, to)
    );
    const allTrx = await fetchAllPages<Transaksi>((from, to) =>
      supabase.from("transaksi").select("*").range(from, to)
    );
    const pelRows = pelData
      .map((p) => {
        const t = allTrx.find((tt) => tt.id === p.transaksi_id);
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
        <h1 className="text-lg font-medium">Laporan</h1>
      </div>

      <div className="mb-4 flex rounded-md border border-gray-300 p-1">
        <button
          onClick={() => setTab("harian")}
          className={`flex-1 rounded py-1.5 text-sm font-medium ${
            tab === "harian" ? "bg-blue-700 text-white" : "text-gray-600"
          }`}
        >
          Harian
        </button>
        <button
          onClick={() => setTab("po")}
          className={`flex-1 rounded py-1.5 text-sm font-medium ${
            tab === "po" ? "bg-blue-700 text-white" : "text-gray-600"
          }`}
        >
          PO {poGroups.length > 0 && `(${poGroups.length})`}
        </button>
      </div>

      {tab === "harian" && (
        <div>
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

          <button
            onClick={exportExcel}
            className="mb-3 w-full rounded-md bg-blue-700 py-2.5 text-sm font-medium text-white"
          >
            Export ke Excel
          </button>

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
        </div>
      )}

      {tab === "po" && (
        <div>
          <p className="mb-3 text-xs text-gray-500">
            Digabung per nama produk, gender, dan ukuran (semua transaksi
            aktif, tidak terikat tanggal).
          </p>

          <button
            onClick={exportPoExcel}
            disabled={poGroups.length === 0}
            className="mb-4 w-full rounded-md bg-amber-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Export daftar PO ke Excel
          </button>

          {loadingPo && (
            <div className="text-sm text-gray-400">Memuat...</div>
          )}
          {!loadingPo && poGroups.length === 0 && (
            <div className="text-sm text-gray-400">
              Tidak ada barang yang masih PO.
            </div>
          )}
          {!loadingPo &&
            poGroups.map((g, i) => (
              <div
                key={i}
                className="mb-1.5 flex items-center justify-between rounded-md border border-gray-200 px-2.5 py-2"
              >
                <div>
                  <div className="text-sm font-medium">
                    {g.nama} &middot; {g.gender} &middot; {g.ukuran}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {g.jumlahTransaksi} transaksi &middot; {g.pembeli.join(", ")}
                  </div>
                </div>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {g.totalQty} unit
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
