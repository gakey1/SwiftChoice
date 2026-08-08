// Tests for changing a password while signed in. Firebase is mocked, so these
// cover the ordering and the D-012 rule: the current password is proved before
// the new one is set, and the second factor is only dropped once the change has
// definitely happened.

import { changePassword } from "@/features/auth/passwordChange";
import { reauthenticate, updateCurrentPassword } from "@/services/auth";
import { clearTotpSecret, isTotpEnrolled } from "@/services/localdb/totpStorage";

jest.mock("@/services/auth", () => ({
  reauthenticate: jest.fn(),
  updateCurrentPassword: jest.fn(),
}));
jest.mock("@/services/localdb/totpStorage", () => ({
  isTotpEnrolled: jest.fn(),
  clearTotpSecret: jest.fn(),
}));

const mockReauth = reauthenticate as jest.Mock;
const mockUpdate = updateCurrentPassword as jest.Mock;
const mockEnrolled = isTotpEnrolled as jest.Mock;
const mockClearTotp = clearTotpSecret as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockReauth.mockResolvedValue(undefined);
  mockUpdate.mockResolvedValue(undefined);
  mockEnrolled.mockResolvedValue(false);
  mockClearTotp.mockResolvedValue(undefined);
});

describe("changePassword, when it works", () => {
  it("proves the current password before setting the new one", async () => {
    const order: string[] = [];
    mockReauth.mockImplementation(async () => {
      order.push("reauthenticate");
    });
    mockUpdate.mockImplementation(async () => {
      order.push("update");
    });

    await changePassword("old-password", "new-password");

    expect(order).toEqual(["reauthenticate", "update"]);
  });

  it("passes the typed passwords through unchanged", async () => {
    await changePassword("old-password", "new-password");

    expect(mockReauth).toHaveBeenCalledWith("old-password");
    expect(mockUpdate).toHaveBeenCalledWith("new-password");
  });

  it("drops the two-factor enrolment, and says that it did", async () => {
    // D-012: the secret and the password vouch for the same person, so a
    // replaced password cannot keep the old factor alive.
    mockEnrolled.mockResolvedValue(true);

    const result = await changePassword("old-password", "new-password");

    expect(mockClearTotp).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, twoFactorWasReset: true });
  });

  it("does not claim to have reset a factor that was never on", async () => {
    // Telling somebody their authenticator was reset when they never had one is
    // confusing rather than reassuring.
    mockEnrolled.mockResolvedValue(false);

    const result = await changePassword("old-password", "new-password");

    expect(mockClearTotp).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, twoFactorWasReset: false });
  });
});

describe("changePassword, when it does not", () => {
  it("refuses a new password identical to the old one", async () => {
    // Firebase accepts this happily, reports success, and silently resets the
    // second factor, which is a strange outcome for doing nothing.
    const result = await changePassword("same-password", "same-password");

    expect(result).toEqual({
      ok: false,
      field: "next",
      message: expect.stringMatching(/current password/i),
    });
    expect(mockReauth).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("changes nothing when the current password is wrong", async () => {
    mockReauth.mockRejectedValue({ code: "auth/invalid-credential" });

    const result = await changePassword("wrong", "new-password");

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockClearTotp).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      field: "current",
      message: expect.stringMatching(/not your current password/i),
    });
  });

  it("keeps the two-factor enrolment when the update itself fails", async () => {
    // The old password still works at this point, so dropping the factor would
    // punish the user for a change that did not happen.
    mockEnrolled.mockResolvedValue(true);
    mockUpdate.mockRejectedValue({ code: "auth/network-request-failed" });

    const result = await changePassword("old-password", "new-password");

    expect(mockClearTotp).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure");
    expect(result.field).toBe("form");
    expect(result.message).toMatch(/network/i);
  });

  it("tells the user to sign in again when the session is too old", async () => {
    mockReauth.mockRejectedValue({ code: "auth/requires-recent-login" });

    const result = await changePassword("old-password", "new-password");

    if (result.ok) throw new Error("expected a failure");
    expect(result.message).toMatch(/log out/i);
  });
});
