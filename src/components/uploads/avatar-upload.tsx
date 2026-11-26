"use client";

import { Camera, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useUpload } from "@/lib/api/hooks/uploads";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { UPLOAD_RULES } from "@/lib/domain/uploads";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Profile photo (ONB-2, ONB-3). Optional: initials stand in until one is added. */
export function AvatarUpload({
  name,
  value,
  onChange,
}: {
  name: string;
  value: StoredFile | null;
  onChange: (file: StoredFile | null) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload("AVATAR");
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
    <div className="flex items-center gap-4">
      <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-heading text-2xl font-semibold text-primary">
        {value?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not a static asset
          <img src={value.url} alt="" width={80} height={80} className="size-full object-cover" />
        ) : (
          initials(name) || <Camera aria-hidden="true" className="size-7" />
        )}
        {upload.isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner label="Uploading photo" />
          </span>
        )}
      </span>
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept={UPLOAD_RULES.AVATAR.accept}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            disabled={upload.isPending}
            aria-describedby={`${id}-hint`}
            onClick={() => input.current?.click()}
          >
            {value ? "Change photo" : "Add photo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange(null)} disabled={upload.isPending}>
              <Trash2 aria-hidden="true" className="size-4" /> Remove
            </Button>
          )}
        </div>
        <p id={`${id}-hint`} className="text-sm">
          {UPLOAD_RULES.AVATAR.label}. Optional.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
