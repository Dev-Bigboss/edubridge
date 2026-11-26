import { describe, expect, it } from "vitest";
import { countryOptions, timeZoneOptions } from "./places";

describe("countryOptions", () => {
  it("names countries and sorts them", () => {
    const list = countryOptions();
    expect(list.find((c) => c.code === "NG")?.name).toBe("Nigeria");
    expect(list[0].name.localeCompare(list[1].name)).toBeLessThanOrEqual(0);
  });
});

describe("timeZoneOptions", () => {
  it("labels zones with their offset and orders west to east", () => {
    const list = timeZoneOptions(new Date("2026-01-15T12:00:00Z"));
    const lagos = list.find((z) => z.zone === "Africa/Lagos");
    expect(lagos?.label).toBe("(UTC+1) Africa/Lagos");
    const i = (z: string) => list.findIndex((x) => x.zone === z);
    expect(i("America/New_York")).toBeLessThan(i("Africa/Lagos"));
    expect(list.some((z) => z.zone === "UTC")).toBe(true);
  });
});
