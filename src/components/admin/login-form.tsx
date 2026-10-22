"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { signInAction, type FormState } from "@/lib/admin/actions";

const initialState: FormState = { status: "idle" };

export function LoginForm() {
  const { locale, dict } = useI18n();
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {state.status === "error" && (
        <Notice tone="danger" role="alert">
          {dict.admin[state.message]}
        </Notice>
      )}
      <Field id="email" label={dict.admin.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          dir="ltr"
          className={inputClass}
        />
      </Field>
      <Field id="password" label={dict.admin.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className={inputClass}
        />
      </Field>
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        <LogIn aria-hidden className="size-5" />
        {pending ? dict.admin.signingIn : dict.admin.signIn}
      </button>
    </form>
  );
}
