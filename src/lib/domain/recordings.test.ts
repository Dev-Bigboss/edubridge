import { describe, expect, it } from "vitest";
import { formatClock, parseClock, playableRange, resumeAt, trimProblem } from "./recordings";

describe("recording playback (REC-4/5)", () => {
  it("plays the trimmed part, clamped to the real length", () => {
    expect(playableRange(600, null)).toEqual({ start: 0, end: 600 });
    expect(playableRange(600, { start_sec: 30, end_sec: 550 })).toEqual({ start: 30, end: 550 });
    expect(playableRange(600, { start_sec: 30, end_sec: 900 })).toEqual({ start: 30, end: 600 });
  });

  it("resumes where the viewer stopped, but starts over near the end or outside the range", () => {
    const r = { start: 30, end: 550 };
    expect(resumeAt(200.7, r)).toBe(200);
    expect(resumeAt(545, r)).toBe(30);
    expect(resumeAt(10, r)).toBe(30);
  });

  it("formats and reads clock times", () => {
    expect(formatClock(245)).toBe("4:05");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(parseClock("1:30")).toBe(90);
    expect(parseClock("90")).toBe(90);
    expect(parseClock("1:02:03")).toBe(3723);
    expect(parseClock("1:x")).toBeNull();
  });

  it("checks a trim", () => {
    expect(trimProblem(0, 600, 600)).toBeNull();
    expect(trimProblem(100, 50, 600)).toBe("order");
    expect(trimProblem(100, 105, 600)).toBe("tooShort");
    expect(trimProblem(0, 700, 600)).toBe("beyond");
  });
});
