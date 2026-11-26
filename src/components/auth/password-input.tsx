"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/field";

/** Password field with a show/hide toggle (keeps autofill and paste working). */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("auth.password");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hide") : t("show")}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-sm text-body hover:text-heading"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  );
}
