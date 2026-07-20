"use client";

import { useEffect, useState } from "react";
import { supabase, Transaksi } from "@/lib/supabase";
import AngkaRibuanInput from "@/components/AngkaRibuanInput";

const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0, 10);

export default function PelunasanPage() {
  const [outstanding, setOutstanding] = useState<Transaksi[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tanggal, setTanggal] = useState(today());
  const [nominalBayar, setNominalBayar] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("transaksi")
      .select("*")
      .eq("status_pembayaran", "DP")
      .eq("dibatalkan", false)
      .order("tanggal", { ascending: true });
    setOutstanding(data ?? []);
  }

  function bukaForm(trx: Transaksi) {
    setSelectedId(selectedId === trx.id ? null : trx.id);
    setNominalBayar(trx.sisa_tagihan); // default: langsung lunas, tapi bisa diedit
    setTanggal(today());
    setError(null);
  }

  async function bayar(trx: Transaksi) {
    setError(null);
    if (nominalBayar <= 0) {
      setError("Nominal pembayaran harus lebih dari 0.");
      return;
    }
    if (nominalBayar > trx.sisa_tagihan) {
      setError(
        `Nominal tidak boleh melebihi sisa tagihan (${formatRp(trx.sisa_tagihan)}).`
      );
      return;
    }

    setSaving(true);
    const nominalDpBaru = trx.nominal_dp + nominalBayar;
    const sisaBaru = trx.total - nominalDpBaru;
    const jadiLunas = sisaBaru <= 0;

    await supabase.from("pelunasan_dp").insert({
      transaksi_id: trx.id,
      tanggal_lunas: tanggal,
      nominal_dilunasi: nominalBayar,
      menjadi_lunas: jadiLunas,
    });
    await supabase
      .from("transaksi")
      .update({
        nominal_dp: nominalDpBaru,
        sisa_tagihan: Math.max(sisaBaru, 0),
        status_pembayaran: jadiLunas ? "Lunas" : "DP",
      })
      .eq("id", trx.id);

    setSaving(false);
    setSelectedId(null);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-medium">Pelunasan DP</h1>
      <div className="mb-4 text-xs text-gray-500">
        {outstanding.length} transaksi belum lunas
      </div>

      {outstanding.map((t) => (
        <div key={t.id} className="mb-2">
          <div className="rounded-md border border-gray-200 p-2.5">
            <div className="mb-1 flex justify-between">
              <span className="text-sm font-medium">{t.no_transaksi}</span>
              <span className="text-[11px] text-gray-400">
                {new Date(t.tanggal).toLocaleDateString("id-ID")}
              </span>
            </div>
            <div className="mb-1.5 text-sm">{t.nama_pembeli}</div>
            <div className="mb-2 flex justify-between text-xs text-gray-500">
              <span>Total {formatRp(t.total)}</span>
              <span>Sudah dibayar {formatRp(t.nominal_dp)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2">
              <span className="text-sm font-medium text-amber-700">
                Sisa {formatRp(t.sisa_tagihan)}
              </span>
              <button
                onClick={() => bukaForm(t)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs"
              >
                {selectedId === t.id ? "Tutup" : "Tambah pembayaran"}
              </button>
            </div>
          </div>

          {selectedId === t.id && (
            <div className="mt-1 rounded-md border border-blue-300 bg-blue-50 p-2.5">
              <label className="mb-1 block text-[11px] text-gray-500">
                Nominal dibayar sekarang
              </label>
              <AngkaRibuanInput
                className="mb-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                value={nominalBayar}
                onChange={setNominalBayar}
                placeholder="100.000"
              />
              <div className="mb-2 text-[11px] text-gray-500">
                Sisa tagihan saat ini: {formatRp(t.sisa_tagihan)}
                {nominalBayar > 0 && nominalBayar < t.sisa_tagihan && (
                  <> &mdash; setelah ini masih sisa{" "}
                    {formatRp(t.sisa_tagihan - nominalBayar)} (status tetap DP)
                  </>
                )}
                {nominalBayar >= t.sisa_tagihan && nominalBayar > 0 && (
                  <> &mdash; setelah ini status jadi <b>Lunas</b></>
                )}
              </div>

              <label className="mb-1 block text-[11px] text-gray-500">
                Tanggal pembayaran
              </label>
              <input
                type="date"
                className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />

              {error && (
                <div className="mb-2 text-xs text-red-600">{error}</div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex-1 rounded-md border border-gray-300 bg-white py-1.5 text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => bayar(t)}
                  disabled={saving}
                  className="flex-1 rounded-md bg-blue-700 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Konfirmasi pembayaran"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {outstanding.length === 0 && (
        <div className="text-sm text-gray-400">
          Tidak ada transaksi DP yang outstanding.
        </div>
      )}
    </div>
  );
}
