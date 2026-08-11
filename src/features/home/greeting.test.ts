// Tests for the Home greeting. Mostly boundaries, because every fault this
// function can have lives at one.

// The two functions under test.
import { greetingFor, greetingPeriod } from "@/features/home/greeting";

describe("greetingPeriod", () => {
  it("calls the working day morning, afternoon and evening", () => {
    expect(greetingPeriod(9)).toBe("morning");
    expect(greetingPeriod(14)).toBe("afternoon");
    expect(greetingPeriod(20)).toBe("evening");
  });

  // Both sides of each boundary, since an off-by-one here is invisible except
  // for one wrong hour a day.
  it("switches exactly on the hour, not one either side", () => {
    expect(greetingPeriod(11)).toBe("morning");
    expect(greetingPeriod(12)).toBe("afternoon");
    expect(greetingPeriod(17)).toBe("afternoon");
    expect(greetingPeriod(18)).toBe("evening");
  });

  // Somebody awake at 2am has not started a new day in any sense they would
  // recognise, so "Good morning" would read as a bug to them.
  it("treats the small hours as evening rather than morning", () => {
    expect(greetingPeriod(0)).toBe("evening");
    expect(greetingPeriod(2)).toBe("evening");
    expect(greetingPeriod(4)).toBe("evening");
    expect(greetingPeriod(5)).toBe("morning");
  });

  // Guards a future edit that changes a boundary and leaves an hour matching
  // nothing, which would show an empty greeting rather than fail loudly.
  it("covers all 24 hours with no gap", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(["morning", "afternoon", "evening"]).toContain(greetingPeriod(hour));
    }
  });
});

describe("greetingFor", () => {
  it("keeps the design's question after the greeting", () => {
    expect(greetingFor(9)).toBe("Good morning! What decision can I help with today?");
  });

  // The whole point. If this ever collapses to one value the feature is gone
  // and nothing else would notice.
  it("actually varies through the day", () => {
    const distinct = new Set([greetingFor(9), greetingFor(14), greetingFor(20)]);
    expect(distinct.size).toBe(3);
  });
});
