import type { Metadata } from "next";
import "./globals.css";
import SidebarNav from "@/components/SidebarNav";

export const metadata: Metadata = {
  title: "Toko Seragam",
  description: "Aplikasi pencatatan transaksi toko seragam",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <SidebarNav />
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
          {children}
        </main>
      </body>
    </html>
  );
}
