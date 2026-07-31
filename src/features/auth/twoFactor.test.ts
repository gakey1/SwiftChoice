// Tests for the D-012 policy: a password change invalidates the second factor.
//
// The storage either side is mocked, so these check the decision logic itself.
// The case that matters most is the last one: the flag has to be consumed, or a
// single reset would keep wiping every enrolment the user creates from then on.

import { consumePasswordResetInvalidation } from "@/features/auth/twoFactor";
import { clearTotpSecret, isTotpEnrolled } from "@/services/localdb/totpStorage";
import {
  clearPasswordResetRequested,
  wasPasswordResetRequested,
} from "@/services/localdb/passwordResetFlag";

jest.mock("@/services/localdb/totpStorage", () => ({
  clearTotpSecret: jest.fn(),
  isTotpEnrolled: jest.fn(),
}));
jest.mock("@/services/localdb/passwordResetFlag", () => ({
  clearPasswordResetRequested: jest.fn(),
  wasPasswordResetRequested: jest.fn(),
}));

const mockClearSecret = clearTotpSecret as jest.Mock;
const mockIsEnrolled = isTotpEnrolled as jest.Mock;
const mockClearFlag = clearPasswordResetRequested as jest.Mock;
const mockWasRequested = wasPasswordResetRequested as jest.Mock;

describe("consumePasswordResetInvalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing when no reset was requested", async () => {
    mockWasRequested.mockResolvedValue(false);

    await expect(consumePasswordResetInvalidation()).resolves.toBe(false);
    expect(mockClearSecret).not.toHaveBeenCalled();
    expect(mockClearFlag).not.toHaveBeenCalled();
  });

  it("clears the enrolment after a reset, and reports that it did", async () => {
    mockWasRequested.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);

    await expect(consumePasswordResetInvalidation()).resolves.toBe(true);
    expect(mockClearSecret).toHaveBeenCalledTimes(1);
  });

  it("reports nothing to a user who never had two-factor on", async () => {
    mockWasRequested.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);

    // False, so the caller does not show a notice about a feature the user
    // never switched on.
    await expect(consumePasswordResetInvalidation()).resolves.toBe(false);
    expect(mockClearSecret).not.toHaveBeenCalled();
  });

  it("consumes the flag either way, so one reset acts exactly once", async () => {
    mockWasRequested.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);

    await consumePasswordResetInvalidation();

    // Without this the flag would survive, and every later sign-in would wipe
    // whatever enrolment the user had since set up.
    expect(mockClearFlag).toHaveBeenCalledTimes(1);
  });
});
