// Tests for the sign up and login form checks. No React and no Firebase, so
// these are quick and cover only the rules: a valid email, a long enough
// password, matching passwords, and the looser login behaviour.

// The checks under test.
import {
  hasErrors,
  MIN_PASSWORD_LENGTH,
  validateConfirmPassword,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
} from "@/features/auth/validation";

// Email: empty and malformed values fail, a proper address passes.
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

// Password: the boundary is asserted from the constant, so changing the minimum
// cannot leave the tests passing against the old number.
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

// Confirm password: it has to match the first one exactly.
describe("validateConfirmPassword", () => {
  it("rejects a mismatch", () => {
    expect(validateConfirmPassword("password123", "password124")).toBeDefined();
  });
  it("accepts a match", () => {
    expect(validateConfirmPassword("password123", "password123")).toBeUndefined();
  });
});

// The whole sign up form: valid input passes, and every bad field is flagged in
// one go rather than one per attempt.
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

// The login form: a valid email and a password, but no length rule.
describe("validateLoginForm", () => {
  it("returns no errors for valid input", () => {
    const errors = validateLoginForm({ email: "a@b.com", password: "anything" });
    expect(hasErrors(errors)).toBe(false);
  });

  it("requires a well-formed email", () => {
    expect(validateLoginForm({ email: "bad", password: "anything" }).email).toBeDefined();
  });

  // A short password is fine on login, since an older account may predate the
  // length rule and rejecting it here would lock the owner out.
  it("requires a non-empty password but does not enforce length", () => {
    expect(validateLoginForm({ email: "a@b.com", password: "" }).password).toBeDefined();
    expect(validateLoginForm({ email: "a@b.com", password: "x" }).password).toBeUndefined();
  });
});
