"use client";

import { FileText, Megaphone, Paperclip, SendHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useSendMessage } from "@/lib/api/hooks/messages";
import { useUpload } from "@/lib/api/hooks/uploads";
import type { Conversation } from "@/lib/api/schemas/messages";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { cn } from "@/lib/cn";
import { MAX_ATTACHMENTS, MESSAGE_MAX_LENGTH } from "@/lib/domain/messages";
import { UPLOAD_RULES, formatBytes } from "@/lib/domain/uploads";

const DRAFT_DAYS = 7;
const draftKey = (id: string) => `edubridge.draft.${id}`;

/** Unsent text survives a refresh or switching conversations, for a week. Storage may be blocked: then it just isn't kept. */
function readDraft(id: string): string {
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return "";
    const { text, at } = JSON.parse(raw) as { text: string; at: number };
    return Date.now() - at < DRAFT_DAYS * 86_400_000 ? text : "";
  } catch {
    return "";
  }
}
function writeDraft(id: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(draftKey(id), JSON.stringify({ text, at: Date.now() }));
    else localStorage.removeItem(draftKey(id));
  } catch {
    /* storage blocked: drafts aren't kept */
  }
}

/** MSG-3/4: write, attach (scanned uploads), send with Enter. Nothing typed is lost if sending fails. */
export function Composer({ conversation, onSent }: { conversation: Conversation; onSent: () => void }) {
  const t = useTranslations("inbox");
  const id = useId();
  const send = useSendMessage(conversation.id);
  const upload = useUpload("MESSAGE_ATTACHMENT");
  const [text, setText] = useState(() => readDraft(conversation.id));
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [announce, setAnnounce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per message being written: a retry after a timeout returns the first send, not a duplicate.
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => writeDraft(conversation.id, text), [conversation.id, text]);

  // Grow with the text up to about six lines.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  const tooLong = text.length > MESSAGE_MAX_LENGTH;
  const empty = !text.trim() && files.length === 0;
  const busy = send.isPending || upload.isPending;

  const submit = () => {
    if (empty || busy) return;
    if (tooLong) return setError(t("tooLong", { max: MESSAGE_MAX_LENGTH }));
    setError(null);
    send.mutate(
      { body: text.trim(), attachment_ids: files.map((f) => f.id), announcement: announce, client_id: clientId },
      {
        onSuccess: () => {
          setText("");
          setFiles([]);
          setAnnounce(false);
          setClientId(crypto.randomUUID());
          onSent();
          area.current?.focus();
        },
        onError: (e) => setError(e instanceof ApiError ? (Object.values(e.fieldErrors ?? {})[0]?.[0] ?? e.message) : t("sendFailed")),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const attach = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const room = MAX_ATTACHMENTS - files.length;
    if (room <= 0) return setError(t("tooManyFiles", { max: MAX_ATTACHMENTS }));
    try {
      for (const f of Array.from(list).slice(0, room)) {
        const stored = await upload.mutateAsync(f);
        setFiles((prev) => [...prev, stored]);
      }
      if (list.length > room) setError(t("tooManyFiles", { max: MAX_ATTACHMENTS }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("uploadFailed"));
    } finally {
      if (picker.current) picker.current.value = "";
    }
  };

  return (
    <form
      className="border-t border-border-subtle bg-white px-3 py-3 sm:px-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {files.length > 0 && (
        <ul aria-label={t("attachments")} className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex max-w-full items-center gap-2 rounded-sm border border-border bg-surface-1 py-1 pr-1 pl-2 text-sm">
              <FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="truncate text-heading">{f.name}</span>
              <span className="shrink-0">{formatBytes(f.size_bytes)}</span>
              <Button type="button" variant="ghost" size="icon" className="size-9 min-w-9" aria-label={t("removeFile", { name: f.name })} onClick={() => setFiles(files.filter((x) => x.id !== f.id))}>
                <X aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {conversation.can_announce && (
        <label className="mb-2 flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm text-heading">
          <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="size-5 accent-primary" />
          <Megaphone aria-hidden="true" className="size-4 text-primary" />
          {t("asAnnouncement")}
        </label>
      )}
      <div className="flex items-end gap-2">
        <input ref={picker} type="file" multiple accept={UPLOAD_RULES.MESSAGE_ATTACHMENT.accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => attach(e.target.files)} />
        <Button type="button" variant="ghost" size="icon" loading={upload.isPending} aria-label={upload.isPending ? t("uploading") : t("attach")} onClick={() => picker.current?.click()} disabled={busy || files.length >= MAX_ATTACHMENTS}>
          {!upload.isPending && <Paperclip aria-hidden="true" className="size-5" />}
        </Button>
        <label htmlFor={`${id}-text`} className="sr-only">
          {t("writeTo", { name: conversation.title })}
        </label>
        <textarea
          id={`${id}-text`}
          ref={area}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          aria-invalid={error || tooLong ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className={cn(
            "max-h-[168px] min-h-11 flex-1 resize-none rounded-sm border border-border bg-white px-3 py-2.5 text-[16px] leading-relaxed text-heading",
            "placeholder:text-body/70 hover:border-body/50 focus:border-primary focus:outline-2 focus:outline-primary/25",
            "aria-invalid:border-danger",
          )}
        />
        <Button type="submit" loading={send.isPending} disabled={empty || busy} aria-label={t("send")}>
          {!send.isPending && <SendHorizontal aria-hidden="true" className="size-4" />}
          <span className="hidden sm:inline">{t("send")}</span>
        </Button>
      </div>
      <p id={`${id}-hint`} className={cn("mt-1 text-xs", tooLong && "text-danger")}>
        {text.length > MESSAGE_MAX_LENGTH - 500 ? t("count", { count: text.length, max: MESSAGE_MAX_LENGTH }) : t("hint")}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
