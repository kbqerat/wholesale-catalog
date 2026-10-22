"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { EmptyState, buttonClass } from "@/components/ui";

export default function ShopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useI18n();
  return (
    <EmptyState
      icon={<TriangleAlert className="size-7" />}
      title={dict.catalog.errorTitle}
      body={dict.catalog.errorBody}
      action={
        <button type="button" className={buttonClass("primary")} onClick={reset}>
          <RefreshCw aria-hidden className="size-4" />
          {dict.common.retry}
        </button>
      }
    />
  );
}
