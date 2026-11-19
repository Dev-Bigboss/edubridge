"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { LoadingState } from "@/components/ui/spinner";
import { useApiReady } from "@/components/providers";
import { api } from "@/lib/api/client";
import { SessionResponse } from "@/lib/api/schemas/auth";
import { afterSignInPath, safeNextPath } from "@/lib/auth/routes";
import { sessionKey } from "@/lib/auth/session";

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "on";

/**
 * Landing page after Google (ONB-1). The backend has already set the session cookie, or sent
 * ?error=CODE. We read the session and apply the usual gates (consent, onboarding).
 */
export function GoogleCallback() {
  const t = useTranslations("auth.googleCallback");
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const ready = useApiReady();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    const next = safeNextPath(params.get("next"));
    const fail = (code: string) => router.replace(`/login?error=${encodeURIComponent(code)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);

    const error = params.get("error");
    if (error) return fail(error);

    const request =
      MOCKING && params.get("mock")
        ? api("/__mock/google", { method: "POST", body: { role: params.get("role") }, schema: SessionResponse })
        : api("/auth/me", { schema: SessionResponse });

    request
      .then(({ user }) => {
        qc.setQueryData(sessionKey, user);
        router.replace(afterSignInPath(user, next));
      })
      .catch(() => fail("GOOGLE_SIGN_IN_FAILED"));
  }, [ready, params, qc, router]);

  return <LoadingState label={t("title")} />;
}
