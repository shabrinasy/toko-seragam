"use client";

function formatRibuan(n: number): string {
  if (!n) return "";
  return n.toLocaleString("id-ID");
}

export default function AngkaRibuanInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={formatRibuan(value)}
      placeholder={placeholder}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        onChange(digits ? parseInt(digits, 10) : 0);
      }}
    />
  );
}
