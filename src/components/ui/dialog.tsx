"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as D } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Modal dialog: focus trapped, Escape and the close button dismiss, scrolls when tall. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const t = useTranslations("common");
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <D.Content
          className={cn(
            // Centred with inset + auto margins rather than transforms, so scrolling inside stays reliable on phones.
            "fixed inset-4 z-50 m-auto h-fit max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain",
            "rounded-md bg-white p-6 shadow-xl focus:outline-none md:p-8",
            wide ? "max-w-[720px]" : "max-w-[520px]",
          )}
          {...(!description && { "aria-describedby": undefined })}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <D.Title className="text-section">{title}</D.Title>
              {description && <D.Description className="mt-1 leading-relaxed">{description}</D.Description>}
            </div>
            <D.Close
              aria-label={t("close")}
              className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-sm text-body hover:bg-surface-1 hover:text-heading"
            >
              <X aria-hidden="true" className="size-5" />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
