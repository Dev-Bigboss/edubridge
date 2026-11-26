"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/schemas/auth";
import { useLogin, useVerifyMfa } from "@/lib/auth/session";
import { DEMO_ACCOUNTS, DEMO_MFA_CODE, DEMO_PASSWORD, type DemoAccount } from "@/mocks/demo-accounts";

const ROLES = ["LEARNER", "INSTRUCTOR", "ADMIN"] as const;

/**
 * Mock mode only: every demo account with what it's for, signed in with one click (password and
 * two-step code filled in), plus a reset back to the starting demo data.
 */
export function DemoAccounts({ onDone }: { onDone: (u: User) => void }) {
  const t = useTranslations("auth.demo");
  const login = useLogin();
  const verify = useVerifyMfa();
  const [busy, setBusy] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const signIn = async (a: DemoAccount) => {
    setBusy(a.email);
    try {
      const res = await login.mutateAsync({ email: a.email, password: DEMO_PASSWORD });
      const user = res.mfa_required ? (await verify.mutateAsync({ mfa_challenge_id: res.mfa_challenge_id, code: DEMO_MFA_CODE })).user : res.user;
      onDone(user);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("failed"));
      setBusy(null);
    }
  };

  const reset = async () => {
    setResetting(true);
    const { resetDb } = await import("@/mocks/db");
    resetDb();
    toast.success(t("resetDone"));
    window.location.reload();
  };

  return (
    <section aria-labelledby="demo-title" className="mt-6 rounded-md border border-dashed border-border bg-white p-4">
      <h2 id="demo-title" className="text-base font-semibold text-heading">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm leading-relaxed">{t("intro", { password: DEMO_PASSWORD, code: DEMO_MFA_CODE })}</p>
      {ROLES.map((role) => (
        <div key={role} className="mt-4">
          <h3 className="mb-1 text-xs font-semibold tracking-[0.06em] text-body uppercase">{t(`roles.${role}`)}</h3>
          <ul className="divide-y divide-border-subtle">
            {DEMO_ACCOUNTS.filter((a) => a.role === role).map((a) => (
              <li key={a.email} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-heading">{a.name}</p>
                  <p className="truncate font-mono text-xs">{a.email}</p>
                  <p className="text-xs leading-snug">{a.tests}</p>
                </div>
                <Button
                  variant="outline"
                  className="shrink-0"
                  loading={busy === a.email}
                  disabled={busy !== null && busy !== a.email}
                  onClick={() => void signIn(a)}
                  aria-label={t("signInAs", { name: a.name })}
                >
                  {t("signIn")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-4 border-t border-border-subtle pt-3">
        <Button variant="ghost" loading={resetting} onClick={() => void reset()}>
          <RotateCcw aria-hidden="true" className="size-4" />
          {t("reset")}
        </Button>
        <p className="mt-1 text-xs leading-snug">{t("resetHint")}</p>
      </div>
    </section>
  );
}
