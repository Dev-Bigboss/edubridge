/**
 * Upload rules by purpose. The backend enforces the same limits; checking here first saves people
 * a slow upload that would be rejected. RES-4 sets 100 MB as the default ceiling for resources.
 */
export const UPLOAD_PURPOSES = ["AVATAR", "ID_DOCUMENT", "CREDENTIAL", "THUMBNAIL", "RESOURCE", "MESSAGE_ATTACHMENT"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const MB = 1024 * 1024;
const IMAGES = ["image/jpeg", "image/png", "image/webp"];
/** RES-1: PDF, Word, PowerPoint and Excel (current formats), plus images. */
const OFFICE = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const RESOURCE_RULE = {
  types: [...OFFICE, ...IMAGES],
  maxBytes: 100 * MB,
  accept: [...OFFICE, ...IMAGES, ".pdf", ".docx", ".pptx", ".xlsx"].join(","),
  label: "PDF, Word, PowerPoint, Excel or an image, up to 100 MB",
};

export const UPLOAD_RULES: Record<UploadPurpose, { types: string[]; maxBytes: number; accept: string; label: string }> = {
  AVATAR: { types: IMAGES, maxBytes: 5 * MB, accept: IMAGES.join(","), label: "JPG, PNG or WebP, up to 5 MB" },
  ID_DOCUMENT: {
    types: [...IMAGES, "application/pdf"],
    maxBytes: 10 * MB,
    accept: [...IMAGES, "application/pdf"].join(","),
    label: "PDF, JPG or PNG, up to 10 MB",
  },
  THUMBNAIL: { types: IMAGES, maxBytes: 5 * MB, accept: IMAGES.join(","), label: "JPG, PNG or WebP, up to 5 MB, ideally 1200 × 675" },
  CREDENTIAL: {
    types: [...IMAGES, "application/pdf"],
    maxBytes: 10 * MB,
    accept: [...IMAGES, "application/pdf"].join(","),
    label: "PDF, JPG or PNG, up to 10 MB",
  },
  RESOURCE: RESOURCE_RULE,
  /** MSG-4: the same limits and scan as resources. */
  MESSAGE_ATTACHMENT: RESOURCE_RULE,
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}

/** Returns a readable reason the file can't be used, or null if it can. */
export function checkUpload(purpose: UploadPurpose, file: { type: string; size: number }): string | null {
  const rule = UPLOAD_RULES[purpose];
  if (!rule.types.includes(file.type)) return `That file type isn't supported. Use ${rule.label}.`;
  if (file.size > rule.maxBytes) return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(rule.maxBytes)}.`;
  if (file.size === 0) return "That file is empty.";
  return null;
}
