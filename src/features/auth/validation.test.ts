// Tests for the sign up and login form checks. These run without React or
// Firebase, so they are quick and only check the plain rules: a valid email, a
// long enough password, matching passwords, and the login behaviour.

import {
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateConfirmPassword,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
} from "@/features/auth/validation";

// Email check: empty and malformed values fail, a proper address passes.
describe("validateEmail", () => {
  it("rejects an empty value", () => {
    expect(validateEmail("")).toBeDefined();
  });
  it("rejects a malformed address", () => {
    expect(validateEmail("not-an-email")).toBeDefined();
  });
  it("accepts a valid address", () => {
    expect(validateEmail("a@b.com")).toBeUndefined();
  });
  it("ignores surrounding whitespace", () => {
    expect(validateEmail("  a@b.com  ")).toBeUndefined();
  });
});

// Password check: empty or too short fails, the minimum length passes.
describe("validatePassword", () => {
  it("rejects an empty value", () => {
    expect(validatePassword("")).toBeDefined();
  });
  it("rejects a password below the minimum length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBeDefined();
  });
  it("accepts a password at the minimum length", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH))).toBeUndefined();
  });
});

// Confirm-password check: it has to match the first password.
describe("validateConfirmPassword", () => {
  it("rejects a mismatch", () => {
    expect(validateConfirmPassword("password123", "password124")).toBeDefined();
  });
  it("accepts a match", () => {
    expect(validateConfirmPassword("password123", "password123")).toBeUndefined();
  });
});

// The whole sign up form: valid input passes, and every bad field is flagged.
describe("validateRegisterForm", () => {
  it("returns no errors for valid input", () => {
    const errors = validateRegisterForm({
      email: "a@b.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(hasErrors(errors)).toBe(false);
  });

  it("flags every invalid field at once", () => {
    const errors = validateRegisterForm({
      email: "bad",
      password: "x",
      confirmPassword: "y",
    });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });
});

// The login form: it needs a valid email and a password, but not a long one.
describe("validateLoginForm", () => {
  it("returns no errors for valid input", () => {
    const errors = validateLoginForm({ email: "a@b.com", password: "anything" });
    expect(hasErrors(errors)).toBe(false);
  });

  it("requires a well-formed email", () => {
    expect(validateLoginForm({ email: "bad", password: "anything" }).email).toBeDefined();
  });

  it("requires a non-empty password but does not enforce length", () => {
    expect(validateLoginForm({ email: "a@b.com", password: "" }).password).toBeDefined();
    // A short password is fine on login; the length policy is registration-only.
    expect(validateLoginForm({ email: "a@b.com", password: "x" }).password).toBeUndefined();
  });
});
