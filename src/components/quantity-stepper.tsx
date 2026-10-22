"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MAX_QUANTITY, clampQuantity } from "@/lib/selection/reducer";

/**
 * Accessible quantity control. The text field can be edited freely; the value
 * is clamped to [1, MAX_QUANTITY] when the field loses focus.
 */
export function QuantityStepper({
  id,
  value,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
  disabled = false,
  size = "md",
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const button =
    size === "sm"
      ? "size-9 rounded-lg"
      : "size-11 rounded-xl";

  function commit(raw: string) {
    setDraft(null);
    const parsed = Number(raw);
    onChange(raw.trim() === "" || !Number.isFinite(parsed) ? value : clampQuantity(parsed));
  }

  return (
    <div className="inline-flex items-center gap-1.5" dir="ltr">
      <button
        type="button"
        className={`${button} flex items-center justify-center border border-line-strong bg-surface hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40`}
        onClick={() => onChange(clampQuantity(value - 1))}
        disabled={disabled || value <= 1}
        aria-label={decreaseLabel}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        className={`num ${size === "sm" ? "h-9 w-14" : "h-11 w-16"} rounded-lg border border-line-strong bg-surface text-center text-[15px] font-semibold disabled:opacity-50`}
        value={draft ?? String(value)}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
        }}
      />
      <button
        type="button"
        className={`${button} flex items-center justify-center border border-line-strong bg-surface hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40`}
        onClick={() => onChange(clampQuantity(value + 1))}
        disabled={disabled || value >= MAX_QUANTITY}
        aria-label={increaseLabel}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
