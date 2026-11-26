import { describe, expect, it } from "vitest";
import { checkUpload, formatBytes } from "./uploads";

describe("checkUpload", () => {
  it("accepts allowed types within the limit", () => {
    expect(checkUpload("AVATAR", { type: "image/png", size: 200_000 })).toBeNull();
    expect(checkUpload("ID_DOCUMENT", { type: "application/pdf", size: 2_000_000 })).toBeNull();
  });
  it("explains wrong types, oversize and empty files", () => {
    expect(checkUpload("AVATAR", { type: "application/pdf", size: 10 })).toMatch(/isn't supported/);
    expect(checkUpload("AVATAR", { type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/6\.0 MB.*5\.0 MB/);
    expect(checkUpload("CREDENTIAL", { type: "image/png", size: 0 })).toMatch(/empty/);
  });
});

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(15 * 1024 * 1024)).toBe("15 MB");
  });
});
