import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover disabled:bg-line-strong disabled:text-muted",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-canvas disabled:text-muted disabled:bg-canvas",
  ghost: "text-ink hover:bg-ink/5 disabled:text-muted",
  danger: "bg-surface text-danger border border-danger/40 hover:bg-danger-soft disabled:opacity-60",
  whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-hover disabled:bg-line-strong disabled:text-muted",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-[15px] gap-2",
  lg: "min-h-12 px-5 text-base gap-2",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return [
    "inline-flex items-center justify-center rounded-xl font-semibold transition-colors",
    "disabled:cursor-not-allowed",
    variantClasses[variant],
    sizeClasses[size],
    extra,
  ].join(" ");
}

export const inputClass =
  "block w-full min-h-11 rounded-xl border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-muted/80 " +
  "focus-visible:border-focus aria-[invalid=true]:border-danger";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "danger" | "warn";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-ink/5 text-ink",
    success: "bg-brand-soft text-brand",
    danger: "bg-danger-soft text-danger",
    warn: "bg-warn-soft text-warn",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  role,
}: {
  tone?: "info" | "warn" | "danger";
  title?: string;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  const tones = {
    info: "border-line bg-surface text-ink",
    warn: "border-warn/30 bg-warn-soft text-warn",
    danger: "border-danger/30 bg-danger-soft text-danger",
  };
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div role={role} className={`flex gap-3 rounded-xl border p-3.5 text-sm ${tones[tone]}`}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-canvas text-muted" aria-hidden>
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
