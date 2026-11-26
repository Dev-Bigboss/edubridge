"use client";

import { useMutation } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api/client";
import { CreateUploadResponse, FileResponse, type StoredFile } from "@/lib/api/schemas/uploads";
import { checkUpload, type UploadPurpose } from "@/lib/domain/uploads";

/**
 * Three steps, so file bytes never pass through our API servers:
 * 1. ask the API for a signed upload URL, 2. PUT the file straight to storage, 3. tell the API it's done.
 */
export async function uploadFile(purpose: UploadPurpose, file: File): Promise<StoredFile> {
  const problem = checkUpload(purpose, file);
  if (problem) throw new ApiError(422, { code: "FILE_REJECTED", message: problem });

  const { file: created, upload } = await api("/uploads", {
    method: "POST",
    body: { purpose, filename: file.name, content_type: file.type, size_bytes: file.size },
    schema: CreateUploadResponse,
  });
  const put = await fetch(upload.url, { method: "PUT", headers: upload.headers, body: file }).catch(() => null);
  if (!put?.ok) {
    throw new ApiError(502, { code: "UPLOAD_FAILED", message: "The upload didn't finish. Check your connection and try again." });
  }
  const done = await api(`/uploads/${created.id}/complete`, { method: "POST", schema: FileResponse });
  return done.file;
}

export function useUpload(purpose: UploadPurpose) {
  return useMutation({ mutationFn: (file: File) => uploadFile(purpose, file) });
}
