// Tests for the friendly error messages shown on the auth forms. Sign up can be
// specific about what went wrong, while login always returns the same message so
// no one can tell which emails are registered.

import {
  loginErrorMessage,
  passwordResetErrorMessage,
  registerErrorMessage,
} from "@/features/auth/errorMessages";

// Sign up messages: each Firebase code maps to its own message, with a fallback.
describe("registerErrorMessage", () => {
  it("keeps the existing-account case specific, unlike login", () => {
    expect(registerErrorMessage({ code: "auth/email-already-in-use" })).toMatch(/already exists/i);
  });

  it("maps a weak password", () => {
    expect(registerErrorMessage({ code: "auth/weak-password" })).toMatch(/stronger/i);
  });

  it("maps an invalid email", () => {
    expect(registerErrorMessage({ code: "auth/invalid-email" })).toMatch(/valid email/i);
  });

  it("falls back for an unknown code", () => {
    expect(registerErrorMessage({ code: "auth/some-new-code" })).toMatch(/could not create/i);
  });

  it("handles a non-Firebase error", () => {
    expect(registerErrorMessage(new Error("boom"))).toMatch(/something went wrong/i);
  });
});

// Login messages: the credential codes all collapse to one message, and it
// never says which field was wrong.
describe("loginErrorMessage", () => {
  it("collapses all four credential codes to one generic message", () => {
    const codes = [
      "auth/invalid-email",
      "auth/user-not-found",
      "auth/wrong-password",
      "auth/invalid-credential",
    ];
    for (const code of codes) {
      expect(loginErrorMessage({ code })).toBe("Incorrect email or password.");
    }
  });

  it("keeps rate-limit and network messages distinct", () => {
    expect(loginErrorMessage({ code: "auth/too-many-requests" })).toMatch(/too many/i);
    expect(loginErrorMessage({ code: "auth/network-request-failed" })).toMatch(/network/i);
  });

  it("never reveals which field was wrong on an unknown code", () => {
    const message = loginErrorMessage({ code: "auth/weird" });
    expect(message).not.toMatch(/email/i);
    expect(message).not.toMatch(/password/i);
  });
});

// Password reset messages: null means "show the normal confirmation anyway", so
// the codes that would reveal whether an account exists return null, and the
// codes the user can act on return a real message.
describe("passwordResetErrorMessage", () => {
  it("returns null for the codes that would reveal a registered email", () => {
    expect(passwordResetErrorMessage({ code: "auth/user-not-found" })).toBeNull();
    expect(passwordResetErrorMessage({ code: "auth/invalid-email" })).toBeNull();
  });

  it("keeps rate-limit and network messages, since the user can act on those", () => {
    expect(passwordResetErrorMessage({ code: "auth/too-many-requests" })).toMatch(/too many/i);
    expect(passwordResetErrorMessage({ code: "auth/network-request-failed" })).toMatch(/network/i);
  });

  it("never says whether the account exists on an unknown code", () => {
    const message = passwordResetErrorMessage({ code: "auth/weird" });
    expect(message).not.toMatch(/account/i);
    expect(message).not.toMatch(/exist/i);
  });
});
