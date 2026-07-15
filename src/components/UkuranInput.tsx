"use client";

import { useState } from "react";

const PRESET_UKURAN = ["S", "M", "L", "XL", "XXL", "XXXL"];
const CUSTOM_VALUE = "__custom__";

export default function UkuranInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const isPreset = PRESET_UKURAN.includes(value);
  const [mode, setMode] = useState<"preset" | "custom">(
    value && !isPreset ? "custom" : "preset"
  );

  if (mode === "custom") {
    return (
      <div>
        <input
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik ukuran (mis. 28, XXXL)"
        />
        <button
          type="button"
          onClick={() => {
            setMode("preset");
            onChange(PRESET_UKURAN[0]);
          }}
          className="mt-1 text-[11px] text-blue-600"
        >
          Pilih dari daftar
        </button>
      </div>
    );
  }

  return (
    <select
      className={className}
      value={isPreset ? value : PRESET_UKURAN[0]}
      onChange={(e) => {
        if (e.target.value === CUSTOM_VALUE) {
          setMode("custom");
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
    >
      {PRESET_UKURAN.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
      <option value={CUSTOM_VALUE}>Lainnya (custom)</option>
    </select>
  );
}
