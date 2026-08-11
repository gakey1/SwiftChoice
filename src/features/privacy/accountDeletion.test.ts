// Tests for account deletion. Everything it touches is mocked, so these
// are about one thing above all others: the order.
//
// The Firestore rule is request.auth.uid == uid, so the account is what grants
// permission to delete the account's data. If the Auth user goes first, or if a
// failed cloud step is stepped over, whatever is left becomes permanently
// undeletable, because no client can authenticate as that uid again and there
// left no Cloud Function to sweep up. That is the only unrecoverable mistake
// available in this feature, so most of what follows exists to prove it cannot
// happen rather than to prove the happy path works.

import { deleteAccount } from "@/features/privacy/accountDeletion";
import { clearLocalData } from "@/features/privacy/localData";
import { deleteCurrentUser, reauthenticate } from "@/services/auth";
import { auth } from "@/services/firebase";
import { deleteAllDecisions, deleteUserDocument } from "@/services/firestore/users";
import { clearPasswordResetRequested } from "@/services/localdb/passwordResetFlag";
import { clearTotpSecret } from "@/services/localdb/totpStorage";

jest.mock("@/features/privacy/localData", () => ({ clearLocalData: jest.fn() }));
jest.mock("@/services/auth", () => ({
  reauthenticate: jest.fn(),
  deleteCurrentUser: jest.fn(),
}));
jest.mock("@/services/firebase", () => ({ auth: { currentUser: { uid: "user-1" } } }));
jest.mock("@/services/firestore/users", () => ({
  deleteAllDecisions: jest.fn(),
  deleteUserDocument: jest.fn(),
  clearBudgetTierCache: jest.fn(),
}));
jest.mock("@/services/localdb/passwordResetFlag", () => ({
  clearPasswordResetRequested: jest.fn(),
}));
jest.mock("@/services/localdb/totpStorage", () => ({ clearTotpSecret: jest.fn() }));

const mockReauthenticate = reauthenticate as jest.Mock;
const mockDeleteUser = deleteCurrentUser as jest.Mock;
const mockDeleteDecisions = deleteAllDecisions as jest.Mock;
const mockDeleteUserDoc = deleteUserDocument as jest.Mock;
const mockClearLocal = clearLocalData as jest.Mock;
const mockClearTotp = clearTotpSecret as jest.Mock;
const mockClearResetFlag = clearPasswordResetRequested as jest.Mock;

const mutableAuth = auth as unknown as { currentUser: { uid: string } | null };

// Records the order steps actually ran in, which is the thing under test. Mock
// call counts alone cannot show that the account went last.
let order: string[] = [];

function record(name: string) {
  return async () => {
    order.push(name);
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  order = [];
  mutableAuth.currentUser = { uid: "user-1" };

  mockReauthenticate.mockImplementation(record("reauthenticate"));
  mockDeleteDecisions.mockImplementation(async () => {
    order.push("decisions");
    return 3;
  });
  mockDeleteUserDoc.mockImplementation(record("user document"));
  mockClearLocal.mockImplementation(async () => {
    order.push("local data");
    return { ok: true, failed: [] };
  });
  mockClearTotp.mockImplementation(record("totp secret"));
  mockClearResetFlag.mockImplementation(record("reset flag"));
  mockDeleteUser.mockImplementation(record("auth user"));
});

describe("deleteAccount, when everything works", () => {
  it("reports success and how many cloud decisions went", async () => {
    const result = await deleteAccount("correct-password");

    expect(result).toEqual({ ok: true, decisionsDeleted: 3 });
  });

  it("deletes the data before the account, and the account last of all", async () => {
    // The load-bearing assertion of this whole feature. Every permission to
    // delete this user's documents comes from the account existing, so the
    // account can only go once nothing else needs it.
    await deleteAccount("correct-password");

    expect(order).toEqual([
      "reauthenticate",
      "decisions",
      "user document",
      "local data",
      "totp secret",
      "reset flag",
      "auth user",
    ]);
    expect(order.indexOf("auth user")).toBe(order.length - 1);
  });

  it("clears the two-factor key and the reset flag, which clearing local data leaves alone", async () => {
    // The on-device wipe deliberately leaves both, because there the account
    // survives. Here it
    // does not, so a re-registration on this phone must not inherit a second
    // factor belonging to an account that no longer exists.
    await deleteAccount("correct-password");

    expect(mockClearTotp).toHaveBeenCalled();
    expect(mockClearResetFlag).toHaveBeenCalled();
  });
});

describe("deleteAccount, when the password is wrong", () => {
  beforeEach(() => {
    mockReauthenticate.mockRejectedValue({ code: "auth/invalid-credential" });
  });

  it("destroys nothing at all", async () => {
    await deleteAccount("wrong-password");

    expect(mockDeleteDecisions).not.toHaveBeenCalled();
    expect(mockDeleteUserDoc).not.toHaveBeenCalled();
    expect(mockClearLocal).not.toHaveBeenCalled();
    expect(mockClearTotp).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("says the password was wrong rather than something generic", async () => {
    const result = await deleteAccount("wrong-password");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure");
    expect(result.failedAt).toBe("your password");
    expect(result.anythingDeleted).toBe(false);
    expect(result.message).toMatch(/password is not right/i);
  });
});

// Each of these proves the same thing from a different step: a failure part way
// through must not reach the account deletion. Written out separately rather
// than as a loop, because a loop that silently stopped covering one of them
// would still pass.
describe("deleteAccount, when a step fails part way through", () => {
  it("leaves the account alone when the cloud history cannot be deleted", async () => {
    mockDeleteDecisions.mockRejectedValue(new Error("offline"));

    const result = await deleteAccount("correct-password");

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure");
    expect(result.failedAt).toBe("the history saved to your account");
  });

  it("leaves the account alone when the user document cannot be deleted", async () => {
    mockDeleteUserDoc.mockRejectedValue(new Error("permission denied"));

    const result = await deleteAccount("correct-password");

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure");
    expect(result.failedAt).toBe("your account record");
  });

  it("leaves the account alone when a store on the phone will not clear", async () => {
    // clearLocalData reports rather than throws, so this failure arrives as a
    // value. Reading only for a thrown error would step straight past it and
    // delete the account with data still on the device.
    mockClearLocal.mockResolvedValue({ ok: false, failed: ["fuel pool"] });

    const result = await deleteAccount("correct-password");

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a failure");
    expect(result.failedAt).toBe("the data on this phone");
  });

  it("tells the user their account still exists so they can try again", async () => {
    mockDeleteUserDoc.mockRejectedValue(new Error("offline"));

    const result = await deleteAccount("correct-password");

    if (result.ok) throw new Error("expected a failure");
    // Somebody who has just pressed Delete and seen an error needs to know
    // whether they are still signed in or locked out of a half-deleted account.
    expect(result.message).toMatch(/account still exists/i);
    expect(result.message).toMatch(/try again/i);
  });

  it("admits when some data had already gone before it stopped", async () => {
    mockDeleteUserDoc.mockRejectedValue(new Error("offline"));

    const result = await deleteAccount("correct-password");

    if (result.ok) throw new Error("expected a failure");
    // Three decisions were deleted before this failed. Saying "nothing was
    // deleted" would be untrue on the one screen where being caught out costs
    // the most.
    expect(result.anythingDeleted).toBe(true);
    expect(result.message).toMatch(/some of your data was deleted/i);
  });

  it("says nothing was deleted when the very first step failed", async () => {
    mockDeleteDecisions.mockRejectedValue(new Error("offline"));

    const result = await deleteAccount("correct-password");

    if (result.ok) throw new Error("expected a failure");
    expect(result.anythingDeleted).toBe(false);
    expect(result.message).toMatch(/nothing was deleted/i);
  });
});

describe("deleteAccount, when the final account deletion fails", () => {
  it("names a stale session as the fixable cause", async () => {
    // Reachable despite the password being asked for up front, because the
    // session can go stale between the screen opening and the button landing.
    mockDeleteUser.mockRejectedValue({ code: "auth/requires-recent-login" });

    const result = await deleteAccount("correct-password");

    if (result.ok) throw new Error("expected a failure");
    expect(result.failedAt).toBe("your account");
    expect(result.message).toMatch(/log out/i);
  });
});
