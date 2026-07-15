"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { href: "/transaksi/baru", label: "Transaksi baru" },
  { href: "/transaksi", label: "Riwayat transaksi" },
  { href: "/pelunasan", label: "Pelunasan DP" },
  { href: "/penerimaan", label: "Penerimaan barang" },
  { href: "/laporan", label: "Laporan harian" },
  { href: "/produk", label: "Master produk" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = items.find((i) => i.href === pathname);

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300"
        >
          <span className="text-lg leading-none">&#9776;</span>
        </button>
        <span className="text-sm font-medium text-gray-700">
          {current?.label ?? "Toko Seragam"}
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-20 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="flex w-72 max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-medium">Toko Seragam</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="flex h-9 w-9 items-center justify-center rounded-md text-xl text-gray-500"
              >
                &times;
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3.5 text-[15px] ${
                      active
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
