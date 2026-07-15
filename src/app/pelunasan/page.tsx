"use client";

import { useEffect, useState } from "react";
import { supabase, Transaksi } from "@/lib/supabase";

const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0, 10);

export default function PelunasanPage() {
  const [outstanding, setOutstanding] = useState<Transaksi[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tanggal, setTanggal] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("transaksi")
      .select("*")
      .eq("status_pembayaran", "DP")
      .order("tanggal", { ascending: true });
    setOutstanding(data ?? []);
  }

  async function lunasi(trx: Transaksi) {
    setSaving(true);
    await supabase.from("pelunasan_dp").insert({
      transaksi_id: trx.id,
      tanggal_lunas: tanggal,
      nominal_dilunasi: trx.sisa_tagihan,
    });
    await supabase
      .from("transaksi")
      .update({ status_pembayaran: "Lunas", sisa_tagihan: 0 })
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
              <span>DP {formatRp(t.nominal_dp)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2">
              <span className="text-sm font-medium text-amber-700">
                Sisa {formatRp(t.sisa_tagihan)}
              </span>
              <button
                onClick={() =>
                  setSelectedId(selectedId === t.id ? null : t.id)
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs"
              >
                Lunasi
              </button>
            </div>
          </div>

          {selectedId === t.id && (
            <div className="mt-1 rounded-md border border-blue-300 bg-blue-50 p-2.5">
              <label className="mb-1 block text-[11px] text-gray-500">
                Tanggal pelunasan
              </label>
              <input
                type="date"
                className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex-1 rounded-md border border-gray-300 bg-white py-1.5 text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => lunasi(t)}
                  disabled={saving}
                  className="flex-1 rounded-md bg-blue-700 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Tandai lunas
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
