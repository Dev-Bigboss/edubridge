import { delay } from "msw";
import { http, HttpResponse } from "msw/http";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { checkUpload, type UploadPurpose } from "@/lib/domain/uploads";
import { newId } from "../db";
import { apiError, requireUser, url } from "./util";

/** Uploaded bytes live only in this tab: object URLs stand in for signed storage URLs. */
const files = new Map<string, StoredFile & { blobUrl?: string }>();

/** Public view of an uploaded file, for other handlers that attach uploads to records. */
export function getUploadedFile(id: string | null | undefined): StoredFile | null {
  const file = id ? files.get(id) : undefined;
  if (!file || file.scan_status !== "CLEAN") return null;
  const publicFile = { ...file };
  delete publicFile.blobUrl;
  return publicFile;
}

export const uploadHandlers = [
  http.post(url("/uploads"), async ({ request }) => {
    await delay(200);
    const user = requireUser();
    if (user instanceof Response) return user;
    const body = (await request.json()) as { purpose: UploadPurpose; filename: string; content_type: string; size_bytes: number };
    const problem = checkUpload(body.purpose, { type: body.content_type, size: body.size_bytes });
    if (problem) return apiError(422, "FILE_REJECTED", problem);
    const file: StoredFile = {
      id: newId("file"),
      purpose: body.purpose,
      name: body.filename,
      content_type: body.content_type,
      size_bytes: body.size_bytes,
      scan_status: "SCANNING",
      url: null,
    };
    files.set(file.id, file);
    return HttpResponse.json(
      { file, upload: { url: url(`/__mock/storage/${file.id}`), method: "PUT", headers: { "Content-Type": body.content_type } } },
      { status: 201 },
    );
  }),

  http.put(url("/__mock/storage/:id"), async ({ params, request }) => {
    await delay(600);
    const file = files.get(String(params.id));
    if (!file) return new HttpResponse(null, { status: 404 });
    const blob = await request.blob();
    file.blobUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : undefined;
    return new HttpResponse(null, { status: 200 });
  }),

  http.post(url("/uploads/:id/complete"), async ({ params }) => {
    await delay(300);
    const file = files.get(String(params.id));
    if (!file) return apiError(404, "NOT_FOUND", "That upload has expired. Please try again.");
    // The mock "scans" instantly. The real API returns SCANNING and the UI polls GET /uploads/{id}.
    file.scan_status = "CLEAN";
    file.url = file.blobUrl ?? `https://placehold.invalid/${file.id}`;
    const publicFile = { ...file };
    delete publicFile.blobUrl;
    return HttpResponse.json({ file: publicFile });
  }),
];
