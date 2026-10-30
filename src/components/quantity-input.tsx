"use client";

import { useState } from "react";
import { clampQuantity } from "@/lib/selection/reducer";

/**
 * Plain quantity field: the client types the number of units. Every
 * keystroke reports the value (clamped to [1, MAX_QUANTITY]), or null when
 * the field is empty, so warnings can show while typing.
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
  onChange: (value: number | null) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function edit(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 5);
    setDraft(digits);
    onChange(digits === "" ? null : clampQuantity(Number(digits)));
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
      onChange={(e) => edit(e.target.value)}
      // Show the clamped value once the client is done typing.
      onBlur={() => setDraft(null)}
    />
  );
}
