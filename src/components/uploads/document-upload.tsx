"use client";

import { FileText, Paperclip, ShieldCheck, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useUpload } from "@/lib/api/hooks/uploads";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { UPLOAD_RULES, formatBytes, type UploadPurpose } from "@/lib/domain/uploads";

/** Upload one or more private documents (ID, certificates). Files are virus-scanned (RES-4). */
export function DocumentUpload({
  label,
  description,
  purpose,
  files,
  onChange,
  max,
  error,
}: {
  label: string;
  description: string;
  purpose: UploadPurpose;
  files: StoredFile[];
  onChange: (files: StoredFile[]) => void;
  max: number;
  error?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload(purpose);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const rule = UPLOAD_RULES[purpose];
  const message = uploadError ?? error;

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploadError(null);
    const room = max - files.length;
    const added: StoredFile[] = [];
    try {
      for (const f of Array.from(list).slice(0, room)) added.push(await upload.mutateAsync(f));
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "The upload didn't finish. Try again.");
    } finally {
      if (added.length) onChange(max === 1 ? added.slice(-1) : [...files, ...added]);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-2" role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-desc${message ? ` ${id}-error` : ""}`}>
      <p id={`${id}-label`} className="font-heading text-[15px] font-medium text-heading">
        {label}
      </p>
      <p id={`${id}-desc`} className="text-sm leading-relaxed">
        {description} {rule.label}.
      </p>

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2">
              <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-heading">{f.name}</span>
                <span className="flex items-center gap-1 text-sm">
                  {formatBytes(f.size_bytes)}
                  {f.scan_status === "CLEAN" && (
                    <>
                      {" · "}
                      <ShieldCheck aria-hidden="true" className="size-4 text-success" /> Checked
                    </>
                  )}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((x) => x.id !== f.id))}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {files.length < max && (
        <>
          <input
            ref={input}
            type="file"
            accept={rule.accept}
            multiple={max > 1}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => pick(e.target.files)}
          />
          <Button type="button" variant="outline" loading={upload.isPending} onClick={() => input.current?.click()}>
            <Paperclip aria-hidden="true" className="size-4" />
            {upload.isPending ? "Uploading" : files.length ? "Add another" : "Choose file"}
          </Button>
        </>
      )}
      {message && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
