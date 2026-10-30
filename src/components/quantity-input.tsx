"use client";

import { useState } from "react";
import { clampQuantity } from "@/lib/selection/reducer";

/**
 * Plain quantity field: the client types the number of units. It can be
 * edited freely; the value is clamped to [1, MAX_QUANTITY] when the field
 * loses focus (or on Enter). Clearing it keeps the previous value, if any.
 */
export function QuantityInput({
  id,
  value,
  onChange,
  label,
  invalid = false,
  describedBy,
  disabled = false,
  size = "md",
}: {
  id: string;
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit(raw: string) {
    setDraft(null);
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    onChange(clampQuantity(parsed));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      dir="ltr"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`num ${size === "sm" ? "h-9 w-24" : "h-11 w-32"} rounded-lg border bg-surface px-3 text-center text-[15px] font-semibold disabled:opacity-50 ${
        invalid ? "border-danger" : "border-line-strong"
      }`}
      value={draft ?? (value === null ? "" : String(value))}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(e.currentTarget.value);
      }}
    />
  );
}
