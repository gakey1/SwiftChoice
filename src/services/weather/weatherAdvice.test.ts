// Tests for the two lines a user actually reads. No network here: these are the
// rules themselves, so every band is checked directly, including the boundaries,
// because a band that is off by one degree is invisible in a screenshot.

// The rules under test, plus the two thresholds, imported rather than typed in
// again so a changed band cannot leave these passing against the old number.
import {
  COLD_FEELS_LIKE_C,
  HOT_FEELS_LIKE_C,
  conditionLabel,
  conditionsAdvice,
  conditionsSummary,
  shouldShowConditions,
  type Readings,
} from "./weatherAdvice";
// The rain threshold, for the same reason.
import { RAIN_LIKELY_PERCENT } from "./weatherService";

// A full set of readings, with only the fields a case cares about overridden.
function readings(overrides: Partial<Readings> = {}): Readings {
  return {
    ok: true,
    temperatureC: 20,
    feelsLikeC: 20,
    rainChancePercent: 5,
    rainLikely: false,
    weatherCode: 0,
    windKph: 8,
    ...overrides,
  };
}

describe("conditionLabel", () => {
  it("names the codes the card can meet", () => {
    expect(conditionLabel(0)).toBe("Clear");
    expect(conditionLabel(3)).toBe("Overcast");
    expect(conditionLabel(65)).toBe("Heavy rain");
    expect(conditionLabel(95)).toBe("Thunderstorms");
  });

  it("says nothing for a code it does not know, rather than guessing", () => {
    expect(conditionLabel(4)).toBeNull();
    expect(conditionLabel(-1)).toBeNull();
  });
});

describe("conditionsSummary", () => {
  it("leads with the sky and the temperature", () => {
    expect(
      conditionsSummary(readings({ weatherCode: 2, temperatureC: 17.4, feelsLikeC: 17.2 }))
    ).toBe("Partly cloudy, 17 degrees");
  });

  it("adds the feels-like figure only when it is far enough from the reading", () => {
    // Two degrees apart is worth saying.
    expect(conditionsSummary(readings({ temperatureC: 17, feelsLikeC: 15 }))).toContain(
      "feels like 15"
    );

    // One degree apart is noise.
    expect(conditionsSummary(readings({ temperatureC: 17, feelsLikeC: 16 }))).not.toContain(
      "feels like"
    );
  });

  it("still reads properly when the sky code is unknown", () => {
    expect(conditionsSummary(readings({ weatherCode: 4, temperatureC: 21, feelsLikeC: 21 }))).toBe(
      "21 degrees"
    );
  });

  it("uses the word rather than the degree symbol, which the content audit rejects", () => {
    const summary = conditionsSummary(readings());
    expect(/^[\x20-\x7E]*$/.test(summary)).toBe(true);
    expect(summary).toContain("degrees");
  });
});

describe("conditionsAdvice, outdoors", () => {
  it("gives umbrella advice when rain is likely", () => {
    const advice = conditionsAdvice(
      readings({ rainLikely: true, rainChancePercent: RAIN_LIKELY_PERCENT }),
      "outdoor"
    );
    expect(advice).toContain("umbrella");
  });

  it("names both when it is cold and raining, since they are two things to carry", () => {
    const advice = conditionsAdvice(
      readings({ rainLikely: true, feelsLikeC: COLD_FEELS_LIKE_C - 5 }),
      "outdoor"
    );
    expect(advice).toContain("jacket");
    expect(advice).toContain("umbrella");
  });

  it("gives jacket advice at the cold boundary and below", () => {
    expect(conditionsAdvice(readings({ feelsLikeC: COLD_FEELS_LIKE_C }), "outdoor")).toContain(
      "jacket"
    );
    expect(conditionsAdvice(readings({ feelsLikeC: COLD_FEELS_LIKE_C - 10 }), "outdoor")).toContain(
      "jacket"
    );
  });

  it("gives heat advice at the hot boundary and above", () => {
    expect(conditionsAdvice(readings({ feelsLikeC: HOT_FEELS_LIKE_C }), "outdoor")).toContain(
      "water"
    );
    expect(conditionsAdvice(readings({ feelsLikeC: HOT_FEELS_LIKE_C + 8 }), "outdoor")).toContain(
      "water"
    );
  });

  it("says conditions are good in between, so the card always has something true to say", () => {
    const advice = conditionsAdvice(readings({ feelsLikeC: 20 }), "outdoor");
    expect(advice).toBe("Good conditions for working outside.");
  });

  it("reads the feels-like figure, not the raw temperature", () => {
    // A warm reading with a cold wind chill is exactly the case a jacket is for,
    // and reading the wrong field would get it backwards.
    const advice = conditionsAdvice(
      readings({ temperatureC: 18, feelsLikeC: COLD_FEELS_LIKE_C - 3 }),
      "outdoor"
    );
    expect(advice).toContain("jacket");
  });
});

describe("conditionsAdvice, indoors", () => {
  it("talks about the journey, not the desk", () => {
    // A library is dry. What the weather affects is getting to it.
    const advice = conditionsAdvice(readings({ rainLikely: true }), "indoor");
    expect(advice).toContain("umbrella");
    expect(advice).toMatch(/on the way/i);
  });

  it("never suggests picking an indoor spot, which would be absurd here", () => {
    const advice = conditionsAdvice(readings({ rainLikely: true }), "indoor");
    expect(advice).not.toMatch(/indoor spot/i);
  });

  it("names both a jacket and an umbrella when it is cold and raining", () => {
    const advice = conditionsAdvice(
      readings({ rainLikely: true, feelsLikeC: COLD_FEELS_LIKE_C - 4 }),
      "indoor"
    );
    expect(advice).toContain("jacket");
    expect(advice).toContain("umbrella");
  });

  it("does not talk about working outside", () => {
    const advice = conditionsAdvice(readings({ feelsLikeC: COLD_FEELS_LIKE_C - 1 }), "indoor");
    expect(advice).not.toMatch(/working outside/i);
    expect(advice).toContain("jacket");
  });
});

describe("shouldShowConditions", () => {
  it("always shows for an outdoor spot, even on a plain day", () => {
    // Outdoors the weather decides whether the spot works at all, so there is
    // always something worth saying.
    expect(shouldShowConditions(readings({ feelsLikeC: 20 }), "outdoor")).toBe(true);
  });

  it("stays quiet indoors on a fine day", () => {
    // A strip on every indoor result is noise, and noise is how a notice earns
    // being ignored.
    expect(shouldShowConditions(readings({ feelsLikeC: 20 }), "indoor")).toBe(false);
  });

  it("speaks up indoors when rain is likely", () => {
    expect(shouldShowConditions(readings({ rainLikely: true }), "indoor")).toBe(true);
  });

  it("speaks up indoors when it is cold enough to want a jacket", () => {
    expect(shouldShowConditions(readings({ feelsLikeC: COLD_FEELS_LIKE_C }), "indoor")).toBe(true);
  });

  it("stays quiet indoors when it is merely hot, since there is nothing to carry", () => {
    expect(shouldShowConditions(readings({ feelsLikeC: HOT_FEELS_LIKE_C + 5 }), "indoor")).toBe(
      false
    );
  });
});
