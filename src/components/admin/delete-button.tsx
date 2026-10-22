"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { buttonClass } from "@/components/ui";
import type { FormState } from "@/lib/admin/actions";

const initialState: FormState = { status: "idle" };

/** Delete with a confirmation prompt; shows the server's error inline. */
export function DeleteButton({
  id,
  confirmMessage,
  action,
  label,
}: {
  id: string;
  confirmMessage: string;
  /** Button text; defaults to "Delete". */
  label?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
      className="contents"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={buttonClass("danger", "sm")}>
        <Trash2 aria-hidden className="size-4" />
        {pending ? dict.admin.deleting : (label ?? dict.admin.delete)}
      </button>
      {state.status === "error" && (
        <p role="alert" className="basis-full text-sm font-medium text-danger">
          {dict.admin[state.message]}
        </p>
      )}
    </form>
  );
}
