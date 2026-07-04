import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "@/services/firebase";
import {
  loginWithEmail,
  logout,
  registerWithEmail,
  reloadAndCheckVerified,
  resendVerificationEmail,
} from "@/services/auth";
import { createUserDocument } from "@/services/firestore/users";

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock("@/services/firebase", () => ({ auth: {}, db: {} }));
jest.mock("@/services/firestore/users", () => ({
  createUserDocument: jest.fn(),
}));

const mockCreate = createUserWithEmailAndPassword as jest.Mock;
const mockSendVerification = sendEmailVerification as jest.Mock;
const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockCreateDoc = createUserDocument as jest.Mock;

// auth.currentUser is not part of the {} mock, so tests that need it set it
// directly through this typed handle.
const mutableAuth = auth as unknown as { currentUser: unknown };

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
