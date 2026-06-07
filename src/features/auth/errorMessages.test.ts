import { registerErrorMessage } from "@/features/auth/errorMessages";

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
