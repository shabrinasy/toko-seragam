"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Produk } from "@/lib/supabase";
import AngkaRibuanInput from "@/components/AngkaRibuanInput";

type ItemBaris = {
  produk: Produk;
  ukuran: string;
  qty: number;
  harga: number;
};

type ProdukGroup = {
  key: string;
  nama: string;
  gender: "Putra" | "Putri";
  varian: Produk[]; // satu baris per ukuran
};

const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

function groupProduk(list: Produk[]): ProdukGroup[] {
  const map = new Map<string, ProdukGroup>();
  for (const p of list) {
    const key = `${p.nama}||${p.gender}`;
    if (!map.has(key)) {
      map.set(key, { key, nama: p.nama, gender: p.gender, varian: [] });
    }
    map.get(key)!.varian.push(p);
  }
  return Array.from(map.values());
}

export default function TransaksiBaruPage() {
  const router = useRouter();
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [namaPembeli, setNamaPembeli] = useState("");
  const [items, setItems] = useState<ItemBaris[]>([]);
  const [statusBayar, setStatusBayar] = useState<"Lunas" | "DP">("Lunas");
  const [nominalDp, setNominalDp] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pilihGroupKey, setPilihGroupKey] = useState<string>("");
  const [pilihUkuran, setPilihUkuran] = useState<string>("");
  const [pilihQty, setPilihQty] = useState(1);
  const [pilihHarga, setPilihHarga] = useState(0);

  const groups = useMemo(() => groupProduk(produkList), [produkList]);
  const groupTerpilih = groups.find((g) => g.key === pilihGroupKey);
  const produkTerpilih = groupTerpilih?.varian.find(
    (v) => v.ukuran === pilihUkuran
  );

  useEffect(() => {
    supabase
      .from("produk")
      .select("*")
      .order("nama")
      .then(({ data }) => {
        const list = data ?? [];
        setProdukList(list);
        const g = groupProduk(list);
        if (g.length > 0) {
          setPilihGroupKey(g[0].key);
          const v = g[0].varian[0];
          setPilihUkuran(v.ukuran);
          setPilihHarga(v.harga_default);
        }
      });
  }, []);

  function pilihGroupBaru(key: string) {
    setPilihGroupKey(key);
    const g = groups.find((gr) => gr.key === key);
    if (g && g.varian.length > 0) {
      setPilihUkuran(g.varian[0].ukuran);
      setPilihHarga(g.varian[0].harga_default);
    }
  }

  function pilihUkuranBaru(ukuran: string) {
    setPilihUkuran(ukuran);
    const v = groupTerpilih?.varian.find((vv) => vv.ukuran === ukuran);
    if (v) setPilihHarga(v.harga_default);
  }

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.harga * it.qty, 0),
    [items]
  );
  const adaItemPO = useMemo(
    () => items.some((it) => it.produk.stok < it.qty),
    [items]
  );
  const sisaTagihan = statusBayar === "DP" ? Math.max(total - nominalDp, 0) : 0;

  // DP hanya masuk akal kalau ada item yang PO (belum tersedia stoknya).
  // Kalau item PO satu-satunya dihapus / semua item ternyata Tersedia,
  // status pembayaran otomatis balik ke Lunas.
  useEffect(() => {
    if (statusBayar === "DP" && !adaItemPO) {
      setStatusBayar("Lunas");
      setNominalDp(0);
    }
  }, [adaItemPO, statusBayar]);

  function tambahItem() {
    if (!produkTerpilih) return;
    setItems((prev) => [
      ...prev,
      {
        produk: produkTerpilih,
        ukuran: produkTerpilih.ukuran,
        qty: pilihQty,
        harga: pilihHarga,
      },
    ]);
    setPilihQty(1);
  }

  function hapusItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function simpanTransaksi() {
    setError(null);
    if (!namaPembeli.trim()) {
      setError("Nama pembeli wajib diisi.");
      return;
    }
    if (items.length === 0) {
      setError("Tambahkan minimal 1 item sebelum menyimpan.");
      return;
    }
    if (statusBayar === "DP" && !adaItemPO) {
      setError(
        "Status DP hanya berlaku kalau ada item yang PO (stok belum cukup)."
      );
      return;
    }
    if (statusBayar === "DP" && (nominalDp <= 0 || nominalDp >= total)) {
      setError("Nominal DP harus lebih dari 0 dan kurang dari total transaksi.");
      return;
    }

    setSaving(true);
    try {
      const { data: noTrxData, error: noTrxErr } = await supabase.rpc(
        "generate_no_transaksi"
      );
      if (noTrxErr) throw noTrxErr;
      const noTransaksi = noTrxData as string;

      const { data: trx, error: trxErr } = await supabase
        .from("transaksi")
        .insert({
          no_transaksi: noTransaksi,
          nama_pembeli: namaPembeli.trim(),
          status_pembayaran: statusBayar,
          nominal_dp: statusBayar === "DP" ? nominalDp : 0,
          sisa_tagihan: sisaTagihan,
          total,
        })
        .select()
        .single();
      if (trxErr) throw trxErr;

      for (const it of items) {
        const statusBarang: "Tersedia" | "PO" =
          it.produk.stok >= it.qty ? "Tersedia" : "PO";

        const { error: detErr } = await supabase.from("transaksi_detail").insert({
          transaksi_id: trx.id,
          produk_id: it.produk.id,
          ukuran: it.ukuran,
          qty: it.qty,
          harga: it.harga,
          subtotal: it.harga * it.qty,
          status_barang: statusBarang,
        });
        if (detErr) throw detErr;

        const { error: stokErr } = await supabase
          .from("produk")
          .update({ stok: it.produk.stok - it.qty })
          .eq("id", it.produk.id);
        if (stokErr) throw stokErr;
      }

      router.push("/transaksi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan transaksi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-medium">Transaksi baru</h1>

      <label className="mb-1 block text-xs text-gray-500">Nama pembeli</label>
      <input
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2"
        value={namaPembeli}
        onChange={(e) => setNamaPembeli(e.target.value)}
        placeholder="Nama pembeli"
      />

      <div className="mb-1 text-xs text-gray-500">Item</div>
      {items.map((it, idx) => {
        const statusBarang = it.produk.stok >= it.qty ? "Tersedia" : "PO";
        return (
          <div key={idx} className="mb-2 rounded-md border border-gray-200 p-2.5">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">{it.produk.nama}</div>
                <div className="mt-1 flex gap-1">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                    {it.produk.gender}
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                    {it.ukuran}
                  </span>
                </div>
              </div>
              <span
                className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] ${
                  statusBarang === "Tersedia"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {statusBarang}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Qty {it.qty} &middot; {formatRp(it.harga)} &middot; Subtotal{" "}
                {formatRp(it.qty * it.harga)}
              </span>
              <button onClick={() => hapusItem(idx)} className="text-red-600">
                Hapus
              </button>
            </div>
          </div>
        );
      })}

      <div className="mb-4 rounded-md border border-dashed border-gray-300 p-2.5">
        <div className="mb-2 text-xs text-gray-500">Tambah item</div>
        <label className="mb-1 block text-[11px] text-gray-400">Produk</label>
        <select
          className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={pilihGroupKey}
          onChange={(e) => pilihGroupBaru(e.target.value)}
        >
          {groups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.nama} &middot; {g.gender}
            </option>
          ))}
        </select>

        <div className="mb-2 flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-gray-400">Ukuran</label>
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={pilihUkuran}
              onChange={(e) => pilihUkuranBaru(e.target.value)}
            >
              {groupTerpilih?.varian.map((v) => (
                <option key={v.id} value={v.ukuran}>
                  {v.ukuran}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-gray-400">
              Harga satuan
            </label>
            <AngkaRibuanInput
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={pilihHarga}
              onChange={setPilihHarga}
              placeholder="150.000"
            />
          </div>
        </div>

        <label className="mb-1 block text-[11px] text-gray-400">Jumlah</label>
        <div className="mb-2 flex items-center gap-2">
          <button
            className="h-9 w-9 rounded-md border border-gray-300"
            onClick={() => setPilihQty((q) => Math.max(1, q - 1))}
          >
            -
          </button>
          <input
            className="w-14 rounded-md border border-gray-300 px-2 py-1.5 text-center text-sm"
            value={pilihQty}
            onChange={(e) => setPilihQty(Number(e.target.value) || 1)}
          />
          <button
            className="h-9 w-9 rounded-md border border-gray-300"
            onClick={() => setPilihQty((q) => q + 1)}
          >
            +
          </button>
          {produkTerpilih && (
            <span className="ml-auto text-[11px] text-gray-400">
              Stok: {produkTerpilih.stok}
            </span>
          )}
        </div>

        <button
          onClick={tambahItem}
          disabled={!produkTerpilih}
          className="w-full rounded-md border border-gray-300 py-2 text-sm"
        >
          + Tambah ke transaksi
        </button>
      </div>

      <div className="mb-3 flex justify-between border-t border-gray-200 pt-3 text-sm font-medium">
        <span>Total</span>
        <span>{formatRp(total)}</span>
      </div>

      <div className="mb-1 text-xs text-gray-500">Status pembayaran</div>
      <div className="mb-1 flex gap-2">
        <button
          onClick={() => setStatusBayar("Lunas")}
          className={`flex-1 rounded-md border py-2 text-sm ${
            statusBayar === "Lunas"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-300"
          }`}
        >
          Lunas
        </button>
        <button
          onClick={() => adaItemPO && setStatusBayar("DP")}
          disabled={!adaItemPO}
          className={`flex-1 rounded-md border py-2 text-sm ${
            statusBayar === "DP"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : adaItemPO
                ? "border-gray-300"
                : "border-gray-200 text-gray-300"
          }`}
        >
          DP
        </button>
      </div>
      {!adaItemPO && (
        <div className="mb-3 text-[11px] text-gray-400">
          DP hanya tersedia kalau ada item yang PO (stok belum cukup).
        </div>
      )}

      {statusBayar === "DP" && (
        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-500">Nominal DP</label>
          <AngkaRibuanInput
            className="mb-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={nominalDp}
            onChange={setNominalDp}
            placeholder="100.000"
          />
          <div className="text-xs text-gray-400">
            Sisa tagihan otomatis: {formatRp(sisaTagihan)}
          </div>
        </div>
      )}

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <button
        onClick={simpanTransaksi}
        disabled={saving}
        className="w-full rounded-md bg-blue-700 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan transaksi"}
      </button>
    </div>
  );
}
