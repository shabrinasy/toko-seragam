"use client";

import { useEffect, useState } from "react";
import { supabase, Produk } from "@/lib/supabase";
import UkuranInput from "@/components/UkuranInput";
import AngkaRibuanInput from "@/components/AngkaRibuanInput";

const formatRp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

type SharedForm = {
  nama: string;
  kategori: string;
  gender: "Putra" | "Putri";
  harga: number;
};

const emptySharedForm: SharedForm = {
  nama: "",
  kategori: "",
  gender: "Putri",
  harga: 0,
};

type UkuranRow = {
  key: string;
  ukuran: string;
  stok: number;
};

function newUkuranRow(): UkuranRow {
  return { key: crypto.randomUUID(), ukuran: "S", stok: 0 };
}

export default function ProdukPage() {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form tambah produk baru: field bersama + banyak baris ukuran/stok
  const [form, setForm] = useState<SharedForm>(emptySharedForm);
  const [ukuranRows, setUkuranRows] = useState<UkuranRow[]>([newUkuranRow()]);

  // Form edit produk existing (1 baris = 1 produk, stok tidak diedit di sini)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SharedForm>(emptySharedForm);
  const [editUkuran, setEditUkuran] = useState("S");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from("produk").select("*").order("nama");
    setProdukList(data ?? []);
  }

  function resetForm() {
    setForm(emptySharedForm);
    setUkuranRows([newUkuranRow()]);
    setError(null);
  }

  function updateUkuranRow(key: string, patch: Partial<UkuranRow>) {
    setUkuranRows((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  }

  function tambahBarisUkuran() {
    setUkuranRows((rows) => [...rows, newUkuranRow()]);
  }

  function hapusBarisUkuran(key: string) {
    setUkuranRows((rows) => rows.filter((r) => r.key !== key));
  }

  async function simpanBaru() {
    setError(null);
    if (!form.nama.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    if (form.harga <= 0) {
      setError("Harga default harus lebih dari 0.");
      return;
    }
    if (ukuranRows.length === 0) {
      setError("Tambahkan minimal 1 ukuran.");
      return;
    }
    const ukuranTerpakai = new Set<string>();
    for (const row of ukuranRows) {
      if (!row.ukuran.trim()) {
        setError("Semua baris ukuran wajib diisi.");
        return;
      }
      if (ukuranTerpakai.has(row.ukuran.trim())) {
        setError(`Ukuran "${row.ukuran}" muncul lebih dari sekali.`);
        return;
      }
      ukuranTerpakai.add(row.ukuran.trim());
    }

    setSaving(true);
    const payload = ukuranRows.map((row) => ({
      nama: form.nama.trim(),
      ukuran: row.ukuran.trim(),
      kategori: form.kategori.trim() || null,
      gender: form.gender,
      harga_default: form.harga,
      stok: row.stok,
    }));
    const { error: err } = await supabase.from("produk").insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    resetForm();
    setShowForm(false);
    load();
  }

  function mulaiEdit(p: Produk) {
    setShowForm(false);
    setEditingId(p.id);
    setEditForm({
      nama: p.nama,
      kategori: p.kategori ?? "",
      gender: p.gender,
      harga: p.harga_default,
    });
    setEditUkuran(p.ukuran);
    setError(null);
  }

  function batalEdit() {
    setEditingId(null);
    setError(null);
  }

  async function simpanEdit() {
    if (editingId == null) return;
    setError(null);
    if (!editForm.nama.trim() || !editUkuran.trim()) {
      setError("Nama dan ukuran wajib diisi.");
      return;
    }
    if (editForm.harga <= 0) {
      setError("Harga default harus lebih dari 0.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("produk")
      .update({
        nama: editForm.nama.trim(),
        ukuran: editUkuran.trim(),
        kategori: editForm.kategori.trim() || null,
        gender: editForm.gender,
        harga_default: editForm.harga,
        // stok sengaja tidak diubah di sini -- hanya lewat transaksi/penerimaan barang
      })
      .eq("id", editingId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEditingId(null);
    load();
  }

  const filtered = produkList.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  );

  function renderSharedFields(
    state: SharedForm,
    setState: (s: SharedForm) => void
  ) {
    return (
      <>
        <label className="mb-1 block text-[11px] text-gray-500">
          Nama seragam
        </label>
        <input
          className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          value={state.nama}
          onChange={(e) => setState({ ...state, nama: e.target.value })}
        />

        <div className="mb-2 flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-gray-500">
              Gender
            </label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              value={state.gender}
              onChange={(e) =>
                setState({
                  ...state,
                  gender: e.target.value as "Putra" | "Putri",
                })
              }
            >
              <option value="Putri">Putri</option>
              <option value="Putra">Putra</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-gray-500">
              Harga default
            </label>
            <AngkaRibuanInput
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              value={state.harga}
              onChange={(n) => setState({ ...state, harga: n })}
              placeholder="150.000"
            />
          </div>
        </div>

        <label className="mb-1 block text-[11px] text-gray-500">
          Kategori (opsional)
        </label>
        <input
          className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          value={state.kategori}
          onChange={(e) => setState({ ...state, kategori: e.target.value })}
        />
      </>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-medium">Master produk</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm((s) => !s);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs"
        >
          + Tambah
        </button>
      </div>

      <input
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        placeholder="Cari produk"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.map((p) => (
        <div key={p.id}>
          <div className="mb-2 rounded-md border border-gray-200 p-2.5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">{p.nama}</div>
                <div className="my-1 flex gap-1">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                    {p.gender}
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                    {p.ukuran}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatRp(p.harga_default)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400">Stok</div>
                <div
                  className={`mb-1.5 text-sm font-medium ${
                    p.stok < 0 ? "text-amber-600" : "text-green-700"
                  }`}
                >
                  {p.stok}
                </div>
                <button
                  onClick={() =>
                    editingId === p.id ? batalEdit() : mulaiEdit(p)
                  }
                  className="rounded-md border border-gray-300 px-2 py-1 text-[11px]"
                >
                  {editingId === p.id ? "Batal" : "Edit"}
                </button>
              </div>
            </div>
          </div>

          {editingId === p.id && (
            <div className="-mt-1 mb-3 rounded-md border border-blue-200 bg-blue-50 p-3">
              <div className="mb-2 text-sm font-medium">Edit produk</div>
              {renderSharedFields(editForm, setEditForm)}

              <label className="mb-1 block text-[11px] text-gray-500">
                Ukuran
              </label>
              <UkuranInput
                className="mb-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                value={editUkuran}
                onChange={setEditUkuran}
              />

              <div className="mb-2 text-[11px] text-gray-500">
                Stok tidak diedit di sini &mdash; stok hanya berubah lewat
                transaksi penjualan atau Penerimaan Barang.
              </div>
              {error && (
                <div className="mb-2 text-xs text-red-600">{error}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={batalEdit}
                  className="flex-1 rounded-md border border-gray-300 bg-white py-2 text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={simpanEdit}
                  disabled={saving}
                  className="flex-1 rounded-md bg-blue-700 py-2 text-sm text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan perubahan"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
            aria-hidden="true"
          />
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Tambah produk baru</div>
              <button
                onClick={() => setShowForm(false)}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-gray-500"
              >
                &times;
              </button>
            </div>
            <div className="mb-3 text-[11px] text-gray-500">
              Isi data yang sama sekali, lalu tambahkan ukuran sebanyak yang
              tersedia &mdash; tiap ukuran boleh punya stok awal berbeda.
            </div>
            {renderSharedFields(form, setForm)}

            <label className="mb-1 block text-[11px] text-gray-500">
              Ukuran &amp; stok awal
            </label>
            {ukuranRows.map((row, idx) => (
              <div key={row.key} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  {idx === 0 && (
                    <div className="mb-1 text-[10px] text-gray-400">
                      Ukuran
                    </div>
                  )}
                  <UkuranInput
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    value={row.ukuran}
                    onChange={(v) => updateUkuranRow(row.key, { ukuran: v })}
                  />
                </div>
                <div className="w-24">
                  {idx === 0 && (
                    <div className="mb-1 text-[10px] text-gray-400">
                      Stok awal
                    </div>
                  )}
                  <input
                    type="number"
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    value={row.stok}
                    onChange={(e) =>
                      updateUkuranRow(row.key, {
                        stok: Number(e.target.value),
                      })
                    }
                  />
                </div>
                {ukuranRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => hapusBarisUkuran(row.key)}
                    aria-label="Hapus baris ukuran"
                    className="h-9 w-9 shrink-0 rounded-md border border-gray-300 bg-white text-red-600"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={tambahBarisUkuran}
              className="mb-3 w-full rounded-md border border-dashed border-gray-400 bg-white py-1.5 text-xs text-gray-600"
            >
              + Tambah ukuran lain
            </button>

            {error && (
              <div className="mb-2 text-xs text-red-600">{error}</div>
            )}

            <button
              onClick={simpanBaru}
              disabled={saving}
              className="w-full rounded-md bg-blue-700 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : `Simpan ${ukuranRows.length} produk`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
