import { z } from "zod";
import { FILE_SCAN_STATUSES } from "@/lib/domain/enums";
import { UPLOAD_PURPOSES } from "@/lib/domain/uploads";

/** Mirrors contracts/openapi/uploads.yaml. */
export const StoredFile = z.object({
  id: z.string(),
  purpose: z.enum(UPLOAD_PURPOSES),
  name: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int(),
  scan_status: z.enum(FILE_SCAN_STATUSES),
  /** Signed, short-lived URL (REC-6 style). Null until the scan passes. */
  url: z.string().nullable(),
});
export type StoredFile = z.infer<typeof StoredFile>;

export const CreateUploadResponse = z.object({
  file: StoredFile,
  upload: z.object({ url: z.string(), method: z.literal("PUT"), headers: z.record(z.string(), z.string()) }),
});

export const FileResponse = z.object({ file: StoredFile });
