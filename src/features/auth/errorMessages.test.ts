// Tests for the friendly error messages shown on the auth forms. Sign up can be
// specific about what went wrong, while login always returns the same message so
// no one can tell which emails are registered.

import {
  deleteAccountErrorMessage,
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

// Delete-account messages: specific where login is deliberately vague. The user
// is already signed in, so naming the failure reveals nothing and saves them
// guessing on a screen where the alternative is giving up on something they
// meant to do.
describe("deleteAccountErrorMessage", () => {
  it("names a wrong password plainly", () => {
    expect(deleteAccountErrorMessage({ code: "auth/wrong-password" })).toMatch(
      /password is not right/i
    );
  });

  it("treats the newer invalid-credential code as a wrong password too", () => {
    // Recent Firebase versions report a bad password this way. Handling only the
    // older code would drop it into the generic message, and the user would have
    // no idea the password was the problem.
    expect(deleteAccountErrorMessage({ code: "auth/invalid-credential" })).toMatch(
      /password is not right/i
    );
  });

  it("tells the user to sign in again when the session is too old", () => {
    // The one failure here with a fix the user can carry out, so it must not be
    // collapsed into "please try again", which would have them retry forever.
    const message = deleteAccountErrorMessage({ code: "auth/requires-recent-login" });
    expect(message).toMatch(/log out/i);
    expect(message).toMatch(/log back in/i);
  });

  it("keeps rate-limit and network messages distinct", () => {
    expect(deleteAccountErrorMessage({ code: "auth/too-many-requests" })).toMatch(/too many/i);
    expect(deleteAccountErrorMessage({ code: "auth/network-request-failed" })).toMatch(/network/i);
  });

  it("falls back to a message that does not claim anything was deleted", () => {
    // An unknown failure means the outcome is unknown, so the wording must not
    // imply the account went.
    const message = deleteAccountErrorMessage({ code: "auth/weird" });
    expect(message).toMatch(/could not delete/i);
  });

  it("does not hide the cause the way login does", () => {
    // Guards against somebody later copying loginErrorMessage over this one for
    // consistency. The vagueness there exists to stop email enumeration, which
    // cannot happen on a screen only a signed-in user can reach.
    expect(deleteAccountErrorMessage({ code: "auth/wrong-password" })).not.toBe(
      "Incorrect email or password."
    );
  });
});
