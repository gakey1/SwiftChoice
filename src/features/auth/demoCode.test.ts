// Tests for the switch that decides whether the sign-in gate prints the answer
// on itself.
//
// Worth testing rather than trusting to a one-line read of __DEV__, because the
// failure is silent and in the wrong direction: a release build that still
// shows the code looks completely normal, and the factor quietly stops nobody.

import { showsDemoCodeOnChallenge } from "@/features/auth/demoCode";

describe("showsDemoCodeOnChallenge", () => {
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
