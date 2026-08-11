// Tests for the rule that a password change invalidates the second factor.
// The storage either side is mocked, so these cover the decision logic itself.

// The function under test.
import { consumePasswordResetInvalidation } from "@/features/auth/twoFactor";
// The two storage modules it reads and clears, mocked below.
import { clearTotpSecret, isTotpEnrolled } from "@/services/localdb/totpStorage";
import {
  clearPasswordResetRequested,
  wasPasswordResetRequested,
} from "@/services/localdb/passwordResetFlag";

// Both storage modules are faked, so each test sets the state it needs.
jest.mock("@/services/localdb/totpStorage", () => ({
  clearTotpSecret: jest.fn(),
  isTotpEnrolled: jest.fn(),
}));
jest.mock("@/services/localdb/passwordResetFlag", () => ({
  clearPasswordResetRequested: jest.fn(),
  wasPasswordResetRequested: jest.fn(),
}));

// Typed handles on the mocks, so the tests can set return values and assert
// calls without casting at every use.
const mockClearSecret = clearTotpSecret as jest.Mock;
const mockIsEnrolled = isTotpEnrolled as jest.Mock;
const mockClearFlag = clearPasswordResetRequested as jest.Mock;
const mockWasRequested = wasPasswordResetRequested as jest.Mock;

describe("consumePasswordResetInvalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The ordinary sign-in, where no reset happened. Nothing should be touched.
  it("does nothing when no reset was requested", async () => {
    mockWasRequested.mockResolvedValue(false);

    await expect(consumePasswordResetInvalidation()).resolves.toBe(false);
    expect(mockClearSecret).not.toHaveBeenCalled();
    expect(mockClearFlag).not.toHaveBeenCalled();
  });

  // The policy itself: a reset drops the enrolment, and says so.
  it("clears the enrolment after a reset, and reports that it did", async () => {
    mockWasRequested.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);

    await expect(consumePasswordResetInvalidation()).resolves.toBe(true);
    expect(mockClearSecret).toHaveBeenCalledTimes(1);
  });

  // False, so the caller does not show a notice about a feature the user never
  // switched on.
  it("reports nothing to a user who never had two-factor on", async () => {
    mockWasRequested.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);

    await expect(consumePasswordResetInvalidation()).resolves.toBe(false);
    expect(mockClearSecret).not.toHaveBeenCalled();
  });

  // Without this the flag would survive, and every later sign-in would wipe
  // whatever enrolment the user had since set up.
  it("consumes the flag either way, so one reset acts exactly once", async () => {
    mockWasRequested.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);

    await consumePasswordResetInvalidation();

    expect(mockClearFlag).toHaveBeenCalledTimes(1);
  });
});
