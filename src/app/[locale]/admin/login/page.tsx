import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { Notice } from "@/components/ui";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({ params }: PageProps<"/[locale]/admin/login">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <title>{dict.admin.loginTitle}</title>
      <div className="space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Lock aria-hidden className="size-5" />
          </div>
          <h1 className="text-xl font-bold">{dict.admin.loginTitle}</h1>
          <p className="text-sm text-muted">{dict.admin.loginIntro}</p>
        </div>
        {isSupabaseConfigured() ? (
          <LoginForm />
        ) : (
          <Notice tone="warn" title={dict.admin.notConfiguredTitle}>
            {dict.admin.notConfiguredBody}
          </Notice>
        )}
      </div>
    </main>
  );
}
