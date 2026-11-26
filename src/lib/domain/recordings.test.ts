import { describe, expect, it } from "vitest";
import { activeSegmentIndex, formatClock, parseClock, parseVtt, playableRange, resumeAt, segmentsInRange, trimProblem } from "./recordings";

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

describe("transcripts (REC-4)", () => {
  const vtt = "WEBVTT\n\nNOTE from Zoom\n\n1\n00:00:00.000 --> 00:00:05.000 align:start\n<v Ada>Welcome back.</v>\n\n00:00:05.000 --> 00:00:10.500\nFirst, a recap\nof control.\n\n01:00:00,000 --> 01:00:02,000\nLater.";
  const segs = parseVtt(vtt);

  it("parses cues, joins lines, strips tags and ignores notes", () => {
    expect(segs).toEqual([
      { start_sec: 0, end_sec: 5, text: "Welcome back." },
      { start_sec: 5, end_sec: 10.5, text: "First, a recap of control." },
      { start_sec: 3600, end_sec: 3602, text: "Later." },
    ]);
  });

  it("keeps only the trimmed part and finds the line being spoken", () => {
    expect(segmentsInRange(segs, { start: 6, end: 60 }).map((s) => s.text)).toEqual(["First, a recap of control."]);
    expect(activeSegmentIndex(segs, 5)).toBe(1);
    expect(activeSegmentIndex(segs, 20)).toBe(-1);
  });
});
