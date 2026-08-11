// Tests for the switch that decides whether the sign-in gate prints the answer
// on itself. Worth pinning rather than trusting a one-line read of __DEV__,
// because a release build that still shows the code looks completely normal.

// The switch under test.
import { showsDemoCodeOnChallenge } from "@/features/auth/demoCode";

describe("showsDemoCodeOnChallenge", () => {
  // __DEV__ is global, so each test restores whatever the suite ran with.
  const original = __DEV__;

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = original;
  });

  it("shows the code in development, so the factor can be demonstrated", () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

    expect(showsDemoCodeOnChallenge()).toBe(true);
  });

  it("hides the code in a release build", () => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

    expect(showsDemoCodeOnChallenge()).toBe(false);
  });
});
