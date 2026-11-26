"use client";

import { Ban, EllipsisVertical, Flag, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenu } from "radix-ui";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { useBlockConversation, useReportConversation } from "@/lib/api/hooks/messages";
import { REPORT_REASONS, type Conversation, type Message, type ReportReason } from "@/lib/api/schemas/messages";
import { cn } from "@/lib/cn";
import { messagePreview } from "@/lib/domain/messages";

const item = "flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-heading outline-none data-[highlighted]:bg-surface-1";

/** MSG-6: report and block, out of the way in the conversation header. */
export function ConversationMenu({ c, messages, me }: { c: Conversation; messages: Message[]; me: string }) {
  const t = useTranslations("inbox.safety");
  const [open, setOpen] = useState<"report" | "block" | null>(null);
  const block = useBlockConversation(c.id);
  const other = c.participants[0]?.name ?? c.title;

  const unblock = () =>
    block.mutate(false, {
      onSuccess: () => toast.success(t("unblocked", { name: other })),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : t("failed")),
    });

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("menu")}>
            <EllipsisVertical aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[220px] rounded-md border border-border-subtle bg-white p-1.5 shadow-[0_10px_30px_rgba(8,42,94,0.12)]">
            <DropdownMenu.Item className={item} onSelect={() => setOpen("report")}>
              <Flag aria-hidden="true" className="size-4" />
              {t("report")}
            </DropdownMenu.Item>
            {c.kind === "DIRECT" && c.blocked !== "BY_THEM" && (
              <DropdownMenu.Item className={cn(item, c.blocked ? "" : "text-danger data-[highlighted]:bg-danger-soft")} onSelect={() => (c.blocked ? unblock() : setOpen("block"))}>
                {c.blocked ? <ShieldCheck aria-hidden="true" className="size-4" /> : <Ban aria-hidden="true" className="size-4" />}
                {c.blocked ? t("unblock", { name: other }) : t("block", { name: other })}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {open === "report" && <ReportDialog c={c} messages={messages} me={me} onClose={() => setOpen(null)} />}
      {open === "block" && <BlockDialog c={c} name={other} onClose={() => setOpen(null)} />}
    </>
  );
}

function BlockDialog({ c, name, onClose }: { c: Conversation; name: string; onClose: () => void }) {
  const t = useTranslations("inbox.safety");
  const block = useBlockConversation(c.id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("blockTitle", { name })} description={t("blockBody", { name })}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button
          variant="danger"
          loading={block.isPending}
          onClick={() =>
            block.mutate(true, {
              onSuccess: () => {
                toast.success(t("blocked", { name }));
                onClose();
              },
              onError: (e) => toast.error(e instanceof ApiError ? e.message : t("failed")),
            })
          }
        >
          {t("blockConfirm", { name })}
        </Button>
      </div>
    </Dialog>
  );
}

/** Pick the reason and (optionally) the message; nothing typed is lost if sending fails. */
function ReportDialog({ c, messages, me, onClose }: { c: Conversation; messages: Message[]; me: string; onClose: () => void }) {
  const t = useTranslations("inbox.safety");
  const id = useId();
  const report = useReportConversation(c.id);
  const theirs = messages.filter((m) => m.sender.id !== me && !m.removed).slice(-20).reverse();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [messageId, setMessageId] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [errors, setErrors] = useState<{ reason?: string; details?: string; form?: string }>({});
  const other = c.participants[0]?.name ?? c.title;

  const submit = () => {
    const next: typeof errors = {};
    if (!reason) next.reason = t("reasonRequired");
    if (reason === "OTHER" && details.trim().length < 5) next.details = t("detailsRequired");
    setErrors(next);
    if (next.reason || next.details) return;
    report.mutate(
      { reason: reason!, message_id: messageId || null, details: details.trim(), block: alsoBlock },
      {
        onSuccess: () => {
          toast.success(t("reported"));
          onClose();
        },
        onError: (e) => setErrors({ form: e instanceof ApiError ? (Object.values(e.fieldErrors ?? {})[0]?.[0] ?? e.message) : t("failed") }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("reportTitle")} description={t("reportBody")}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormError message={errors.form ?? null} />
        <fieldset aria-describedby={errors.reason ? `${id}-reason-error` : undefined}>
          <legend className="mb-2 font-heading text-[15px] font-medium text-heading">{t("reason")}</legend>
          <div className="space-y-1">
            {REPORT_REASONS.map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 hover:bg-surface-1">
                <input type="radio" name={`${id}-reason`} value={r} checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-primary" />
                <span className="text-[15px] text-heading">{t(`reasons.${r}`)}</span>
              </label>
            ))}
          </div>
          {errors.reason && (
            <p id={`${id}-reason-error`} role="alert" className="mt-1 text-sm text-danger">
              {errors.reason}
            </p>
          )}
        </fieldset>

        {theirs.length > 0 && (
          <Field label={t("which")} hint={t("whichHint")}>
            {(a) => (
              <Select {...a} value={messageId} onChange={(e) => setMessageId(e.target.value)}>
                <option value="">{t("whole")}</option>
                {theirs.map((m) => (
                  <option key={m.id} value={m.id}>
                    {`${m.sender.name}: ${messagePreview(m.body, m.attachments.length).slice(0, 70)}`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <Field label={reason === "OTHER" ? t("detailsLabelRequired") : t("detailsLabel")} error={errors.details}>
          {(a) => <Textarea {...a} value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} />}
        </Field>

        {c.kind === "DIRECT" && !c.blocked && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-heading">
            <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="size-5 accent-primary" />
            {t("alsoBlock", { name: other })}
          </label>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={report.isPending}>
            {t("send")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
