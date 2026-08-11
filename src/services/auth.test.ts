// Tests for the auth service. Firebase is mocked, so nothing real is called:
// these check that each function trims the email, writes the user record when it
// should, passes errors through rather than swallowing them, and refuses when
// nobody is signed in.

// Mocked below; imported so the tests can assert what was called.
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// The faked auth instance, whose currentUser each test sets.
import { auth } from "@/services/firebase";
// The functions under test.
import {
  deleteCurrentUser,
  loginWithEmail,
  logout,
  reauthenticate,
  registerWithEmail,
  reloadAndCheckVerified,
  resendVerificationEmail,
  sendPasswordReset,
} from "@/services/auth";
// The Firestore write registration performs, mocked below.
import { createUserDocument } from "@/services/firestore/users";

// Replace the real Firebase and Firestore calls with fakes, so the tests can
// check what was called without touching the network. EmailAuthProvider returns
// its inputs, so the credential can be asserted on.
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  EmailAuthProvider: { credential: jest.fn((email: string, password: string) => ({ email, password })) },
  reauthenticateWithCredential: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock("@/services/firebase", () => ({ auth: {}, db: {} }));
jest.mock("@/services/firestore/users", () => ({
  createUserDocument: jest.fn(),
}));

// Typed handles on the mocks, so the tests can set return values and assert
// calls without casting at every use.
const mockCreate = createUserWithEmailAndPassword as jest.Mock;
const mockSendVerification = sendEmailVerification as jest.Mock;
const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockSendReset = sendPasswordResetEmail as jest.Mock;
const mockCreateDoc = createUserDocument as jest.Mock;
const mockDeleteUser = deleteUser as jest.Mock;
const mockReauthWithCredential = reauthenticateWithCredential as jest.Mock;
const mockCredential = EmailAuthProvider.credential as unknown as jest.Mock;

// auth.currentUser is not part of the {} mock, so tests that need it set it
// directly through this typed handle.
const mutableAuth = auth as unknown as { currentUser: unknown };

// Sign up: the account, the profile document and the verification email are one
// unit, and a failed account must not leave a document behind.
describe("registerWithEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates the account with a trimmed email and writes the user document", async () => {
    mockCreate.mockResolvedValue({ user: { uid: "uid-123" } });
    mockCreateDoc.mockResolvedValue(undefined);

    const uid = await registerWithEmail("  Test@Email.com  ", "password123");

    expect(mockCreate).toHaveBeenCalledWith({}, "Test@Email.com", "password123");
    expect(mockCreateDoc).toHaveBeenCalledWith("uid-123", "Test@Email.com");
    expect(mockSendVerification).toHaveBeenCalledWith({ uid: "uid-123" });
    expect(uid).toBe("uid-123");
  });

  it("propagates auth errors and does not write a user document", async () => {
    mockCreate.mockRejectedValue({ code: "auth/email-already-in-use" });

    await expect(registerWithEmail("a@b.com", "password123")).rejects.toMatchObject({
      code: "auth/email-already-in-use",
    });
    expect(mockCreateDoc).not.toHaveBeenCalled();
  });
});

// Login: trims the email, returns the uid, and lets errors through for the
// screen to word.
describe("loginWithEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs in with a trimmed email and returns the uid", async () => {
    mockSignIn.mockResolvedValue({ user: { uid: "uid-9" } });

    const uid = await loginWithEmail("  user@b.com ", "secretpw");

    expect(mockSignIn).toHaveBeenCalledWith({}, "user@b.com", "secretpw");
    expect(uid).toBe("uid-9");
  });

  it("propagates auth errors", async () => {
    mockSignIn.mockRejectedValue({ code: "auth/invalid-credential" });

    await expect(loginWithEmail("a@b.com", "x")).rejects.toMatchObject({
      code: "auth/invalid-credential",
    });
  });
});

// Logout: one call, no cleverness.
describe("logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs the user out", async () => {
    mockSignOut.mockResolvedValue(undefined);

    await logout();

    expect(mockSignOut).toHaveBeenCalledWith({});
  });
});

// Resend link: refuses with nobody signed in, otherwise emails the current user.
describe("resendVerificationEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutableAuth.currentUser = null;
  });

  it("throws when no one is signed in", async () => {
    await expect(resendVerificationEmail()).rejects.toThrow(
      "No signed-in user to verify."
    );
    expect(mockSendVerification).not.toHaveBeenCalled();
  });

  it("sends the link to the current user", async () => {
    const currentUser = { uid: "uid-7" };
    mutableAuth.currentUser = currentUser;

    await resendVerificationEmail();

    expect(mockSendVerification).toHaveBeenCalledWith(currentUser);
  });
});

// Verify check: the reload is the point, since the local user goes stale the
// moment the link is clicked in a browser.
describe("reloadAndCheckVerified", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutableAuth.currentUser = null;
  });

  it("returns false when no one is signed in", async () => {
    await expect(reloadAndCheckVerified()).resolves.toBe(false);
  });

  it("reloads the user and returns the fresh emailVerified value", async () => {
    const reload = jest.fn().mockResolvedValue(undefined);
    mutableAuth.currentUser = { reload, emailVerified: true };

    await expect(reloadAndCheckVerified()).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

// Password reset: trims the email and lets Firebase errors through, since the
// screen is the one that decides which of them the user is allowed to see.
describe("sendPasswordReset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends the reset email with a trimmed address", async () => {
    mockSendReset.mockResolvedValue(undefined);

    await sendPasswordReset("  a@b.com  ");

    expect(mockSendReset).toHaveBeenCalledWith(auth, "a@b.com");
  });

  it("passes Firebase errors through to the caller", async () => {
    mockSendReset.mockRejectedValue({ code: "auth/too-many-requests" });

    await expect(sendPasswordReset("a@b.com")).rejects.toEqual({
      code: "auth/too-many-requests",
    });
  });
});

// Re-authentication: proves the person holding the phone knows the password,
// which is what Firebase demands before it will delete an account on a session
// older than a few minutes.
describe("reauthenticate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutableAuth.currentUser = { email: "a@b.com" };
  });

  // Taking the email as an argument would let a screen re-authenticate against
  // an address the session does not belong to.
  it("rebuilds the credential from the session's own email, not one passed in", async () => {
    mockReauthWithCredential.mockResolvedValue(undefined);

    await reauthenticate("hunter2");

    expect(mockCredential).toHaveBeenCalledWith("a@b.com", "hunter2");
    expect(mockReauthWithCredential).toHaveBeenCalledWith(
      { email: "a@b.com" },
      { email: "a@b.com", password: "hunter2" }
    );
  });

  it("refuses when no one is signed in", async () => {
    mutableAuth.currentUser = null;

    await expect(reauthenticate("hunter2")).rejects.toThrow(/no signed-in user/i);
    expect(mockReauthWithCredential).not.toHaveBeenCalled();
  });

  it("passes a wrong password through so the caller can word it", async () => {
    mockReauthWithCredential.mockRejectedValue({ code: "auth/invalid-credential" });

    await expect(reauthenticate("wrong")).rejects.toEqual({ code: "auth/invalid-credential" });
  });
});

// Deleting the Firebase account. This is the last step of deleting an account
// and the one that cannot be undone, so it does nothing clever: it deletes, or
// it throws.
describe("deleteCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutableAuth.currentUser = { email: "a@b.com", uid: "user-1" };
  });

  it("deletes the signed-in user", async () => {
    mockDeleteUser.mockResolvedValue(undefined);

    await deleteCurrentUser();

    expect(mockDeleteUser).toHaveBeenCalledWith({ email: "a@b.com", uid: "user-1" });
  });

  it("refuses when no one is signed in", async () => {
    mutableAuth.currentUser = null;

    await expect(deleteCurrentUser()).rejects.toThrow(/no signed-in user/i);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  // auth/requires-recent-login is the one the caller has to turn into an
  // instruction the user can follow, so it must arrive intact.
  it("passes a stale-session refusal through rather than swallowing it", async () => {
    mockDeleteUser.mockRejectedValue({ code: "auth/requires-recent-login" });

    await expect(deleteCurrentUser()).rejects.toEqual({ code: "auth/requires-recent-login" });
  });
});
