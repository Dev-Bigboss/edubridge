import { describe, expect, it } from "vitest";
import { findContactDetails, maskContactDetails } from "./contact-filter";

const kinds = (t: string) => findContactDetails(t).map((m) => [m.kind, m.text]);

describe("findContactDetails", () => {
  it("finds emails, phone numbers in common formats and chat links", () => {
    expect(kinds("Email me at ada.demo+lmp@example.com please")).toEqual([["EMAIL", "ada.demo+lmp@example.com"]]);
    expect(kinds("Call 0803 123 4567 or +234 (803) 123-4567")).toEqual([
      ["PHONE", "0803 123 4567"],
      ["PHONE", "+234 (803) 123-4567"],
    ]);
    expect(kinds("+44 20 7946 0958")).toEqual([["PHONE", "+44 20 7946 0958"]]);
    expect(kinds("WhatsApp: wa.me/2348031234567 or https://t.me/adademo")).toEqual([
      ["CHAT_LINK", "wa.me/2348031234567"],
      ["CHAT_LINK", "https://t.me/adademo"],
    ]);
  });

  it("leaves dates, times, prices, page numbers and years alone", () => {
    for (const text of ["Class on 2026-11-21 at 18:00", "It costs $1,250.00", "See pages 112-118", "The 2025-2026 syllabus", "Room 4021", "ICAN 2025"]) {
      expect(findContactDetails(text), text).toEqual([]);
    }
  });
});

describe("maskContactDetails", () => {
  it("replaces each match and says whether anything changed", () => {
    expect(maskContactDetails("Text 08031234567 or ada@example.com")).toEqual({
      text: "Text [contact details hidden] or [contact details hidden]",
      masked: true,
    });
    expect(maskContactDetails("See you Thursday")).toEqual({ text: "See you Thursday", masked: false });
  });
});
