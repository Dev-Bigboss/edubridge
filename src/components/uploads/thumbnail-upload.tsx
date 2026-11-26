"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useUpload } from "@/lib/api/hooks/uploads";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { UPLOAD_RULES } from "@/lib/domain/uploads";

/** Training card image (TRN-1 "thumbnail"), 16:9. */
export function ThumbnailUpload({ value, onChange }: { value: StoredFile | null; onChange: (f: StoredFile | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload("THUMBNAIL");
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      onChange(await upload.mutateAsync(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The upload didn't finish. Try again.");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative flex aspect-video w-full max-w-[360px] items-center justify-center overflow-hidden rounded-sm border border-dashed border-border bg-surface-1">
        {value?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img src={value.url} alt="" width={360} height={203} className="size-full object-cover" />
        ) : (
          <ImageIcon aria-hidden="true" className="size-8 text-body" />
        )}
        {upload.isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner label="Uploading image" />
          </span>
        )}
      </div>
      <input ref={input} type="file" accept={UPLOAD_RULES.THUMBNAIL.accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={upload.isPending} onClick={() => input.current?.click()}>
          {value ? "Replace image" : "Upload image"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            <Trash2 aria-hidden="true" className="size-4" /> Remove
          </Button>
        )}
      </div>
      <p className="text-sm">{UPLOAD_RULES.THUMBNAIL.label}. Optional.</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
