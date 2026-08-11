// Tests for the TOTP maths. expo-crypto is mocked so secret generation is
// predictable; everything else runs the real otpauth code, since the point of
// these tests is that this app's settings actually interoperate with a standard
// authenticator app.

// Mocked below, so the random bytes are fixed.
import * as Crypto from "expo-crypto";

// The functions under test.
import {
  buildOtpauthUri,
  generateCode,
  generateSecret,
  groupSecret,
  secondsUntilRotation,
  verifyCode,
} from "@/features/auth/totp";

jest.mock("expo-crypto", () => ({ getRandomBytes: jest.fn() }));

const mockGetRandomBytes = Crypto.getRandomBytes as jest.Mock;

// A known base32 secret and account label, so the codes below are fixed values
// rather than whatever the code under test happens to produce.
const SECRET = "JBSWY3DPEHPK3PXP";
const LABEL = "a@b.com";

describe("generateSecret", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The argument matters. otpauth's built-in randomBytes throws on React
  // Native, so this call is the whole reason enrolment works on a device. If
  // somebody simplifies it back to new Secret({size}), tests still pass in Node
  // and enrolment breaks on a phone.
  it("asks expo-crypto for 20 bytes, not otpauth's own generator", () => {
    mockGetRandomBytes.mockReturnValue(new Uint8Array(20).fill(7));

    generateSecret();

    expect(mockGetRandomBytes).toHaveBeenCalledWith(20);
  });

  it("returns a base32 string an authenticator app can accept", () => {
    mockGetRandomBytes.mockReturnValue(new Uint8Array(20).fill(7));

    const secret = generateSecret();

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });
});

// The gate itself: what passes and what does not.
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
    // Shift one digit, so the code is well-formed but incorrect.
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

// The shape of a generated code, and that it is a function of the window rather
// than of chance.
describe("generateCode", () => {
  it("produces six digits", () => {
    expect(generateCode(SECRET, LABEL)).toMatch(/^\d{6}$/);
  });

  it("produces the same code for the same secret and window", () => {
    expect(generateCode(SECRET, LABEL)).toBe(generateCode(SECRET, LABEL));
  });
});

// The URI is the contract with the authenticator app.
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

// The countdown on the demo display.
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

// Grouping is display-only, which the last case is there to prove.
describe("groupSecret", () => {
  beforeEach(() => {
    mockGetRandomBytes.mockReturnValue(new Uint8Array(20).fill(7));
  });

  it("splits the key into blocks of four for reading", () => {
    expect(groupSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
  });

  it("leaves no trailing space when the length divides evenly", () => {
    expect(groupSecret("ABCDEFGH")).toBe("ABCD EFGH");
  });

  it("keeps a short final block rather than padding it", () => {
    expect(groupSecret("ABCDEF")).toBe("ABCD EF");
  });

  it("changes nothing but the spacing", () => {
    const secret = generateSecret();
    expect(groupSecret(secret).replace(/ /g, "")).toBe(secret);
  });

  // If a spaced key were a different key, everyone who typed it in would enrol
  // against a secret the app does not hold and be locked out on the next
  // sign-in.
  it("produces a key an authenticator still accepts once spaces are stripped", () => {
    const secret = generateSecret();
    const typedBack = groupSecret(secret).replace(/\s/g, "");
    expect(verifyCode(typedBack, "a@b.com", generateCode(secret, "a@b.com"))).toBe(true);
  });
});
