import { loginErrorMessage, registerErrorMessage } from "@/features/auth/errorMessages";

describe("registerErrorMessage", () => {
  it("keeps the existing-account case specific (US04, unlike US05 login)", () => {
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

describe("loginErrorMessage", () => {
  it("collapses all four credential codes to one generic message (US05)", () => {
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
