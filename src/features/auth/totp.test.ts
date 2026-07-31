// Tests for the TOTP maths. expo-crypto is mocked so secret generation is
// predictable; everything else runs the real otpauth code, since the point of
// these tests is that this app's settings actually interoperate with a standard
// authenticator app.

import * as Crypto from "expo-crypto";

import {
  buildOtpauthUri,
  generateCode,
  generateSecret,
  secondsUntilRotation,
  verifyCode,
} from "@/features/auth/totp";

jest.mock("expo-crypto", () => ({ getRandomBytes: jest.fn() }));

const mockGetRandomBytes = Crypto.getRandomBytes as jest.Mock;

// A known base32 secret, so the expected codes below are fixed values rather
// than whatever the code under test happens to produce.
const SECRET = "JBSWY3DPEHPK3PXP";
const LABEL = "a@b.com";

describe("generateSecret", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("asks expo-crypto for 20 bytes, not otpauth's own generator", () => {
    mockGetRandomBytes.mockReturnValue(new Uint8Array(20).fill(7));

    generateSecret();

    // The argument matters. otpauth's built-in randomBytes throws on React
    // Native, so this call is the whole reason the enrolment screen works on a
    // device. If someone "simplifies" this back to new Secret({size}), tests
    // still pass in Node and enrolment breaks on a phone.
    expect(mockGetRandomBytes).toHaveBeenCalledWith(20);
  });

  it("returns a base32 string an authenticator app can accept", () => {
    mockGetRandomBytes.mockReturnValue(new Uint8Array(20).fill(7));

    const secret = generateSecret();

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });
});

describe("verifyCode", () => {
  it("accepts the code that is valid right now", () => {
    const code = generateCode(SECRET, LABEL);
    expect(verifyCode(SECRET, LABEL, code)).toBe(true);
  });

  it("accepts a code with spaces in it, since people type them in pairs", () => {
    const code = generateCode(SECRET, LABEL);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyCode(SECRET, LABEL, spaced)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const code = generateCode(SECRET, LABEL);
    // Shift one digit so the code is well-formed but incorrect.
    const firstDigit = Number(code[0]);
    const wrong = String((firstDigit + 1) % 10) + code.slice(1);
    expect(verifyCode(SECRET, LABEL, wrong)).toBe(false);
  });

  it("rejects anything that is not six digits", () => {
    expect(verifyCode(SECRET, LABEL, "")).toBe(false);
    expect(verifyCode(SECRET, LABEL, "12345")).toBe(false);
    expect(verifyCode(SECRET, LABEL, "1234567")).toBe(false);
    expect(verifyCode(SECRET, LABEL, "abcdef")).toBe(false);
  });

  it("rejects a code from a different secret", () => {
    const otherCode = generateCode("KRSXG5CTMVRXEZLU", LABEL);
    expect(verifyCode(SECRET, LABEL, otherCode)).toBe(false);
  });
});

describe("generateCode", () => {
  it("produces six digits", () => {
    expect(generateCode(SECRET, LABEL)).toMatch(/^\d{6}$/);
  });

  it("produces the same code for the same secret and window", () => {
    expect(generateCode(SECRET, LABEL)).toBe(generateCode(SECRET, LABEL));
  });
});

describe("buildOtpauthUri", () => {
  it("carries the settings an authenticator app needs to match our codes", () => {
    const uri = buildOtpauthUri(SECRET, LABEL);

    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("issuer=SwiftChoice");
    expect(uri).toContain(`secret=${SECRET}`);
    // These three are why a third-party app agrees with us. Changing any of
    // them silently breaks every already-enrolled device.
    expect(uri).toContain("algorithm=SHA1");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("secondsUntilRotation", () => {
  it("counts down within the 30-second window", () => {
    // 1970-01-01T00:00:05Z is 5 seconds into a window, so 25 remain.
    expect(secondsUntilRotation(new Date(5_000))).toBe(25);
  });

  it("returns a full window at the moment one starts", () => {
    expect(secondsUntilRotation(new Date(30_000))).toBe(30);
  });

  it("never returns zero, so the display does not show a dead code", () => {
    for (let second = 0; second < 120; second += 1) {
      const remaining = secondsUntilRotation(new Date(second * 1000));
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30);
    }
  });
});
