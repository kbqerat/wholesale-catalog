"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { EmptyState, buttonClass } from "@/components/ui";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useI18n();
  return (
    <EmptyState
      icon={<TriangleAlert className="size-7" />}
      title={dict.errors.genericTitle}
      body={dict.errors.genericBody}
      action={
        <button type="button" className={buttonClass("primary")} onClick={reset}>
          <RefreshCw aria-hidden className="size-4" />
          {dict.common.retry}
        </button>
      }
    />
  );
}
