import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

import { loginWithEmail, registerWithEmail } from "@/services/auth";
import { createUserDocument } from "@/services/firestore/users";

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));
jest.mock("@/services/firebase", () => ({ auth: {}, db: {} }));
jest.mock("@/services/firestore/users", () => ({
  createUserDocument: jest.fn(),
}));

const mockCreate = createUserWithEmailAndPassword as jest.Mock;
const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockCreateDoc = createUserDocument as jest.Mock;

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
