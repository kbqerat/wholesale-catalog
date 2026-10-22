"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { EmptyState, buttonClass } from "@/components/ui";

export default function NotFound() {
  const { locale, dict } = useI18n();
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<Compass className="size-7" />}
        title={dict.errors.notFoundTitle}
        body={dict.errors.notFoundBody}
        action={
          <Link href={`/${locale}`} className={buttonClass("primary")}>
            {dict.errors.goHome}
          </Link>
        }
      />
    </main>
  );
}
