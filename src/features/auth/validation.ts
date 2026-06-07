// Pure client-side validation for the registration form (US04 4.2).
// No React, no Firebase: easy to unit test, reusable on the login screen.

export type RegisterFields = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegisterErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

// Deliberately simple. Firebase is the real authority on email validity;
// this only catches obvious mistakes before a network round trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// At least Firebase's minimum of 6. We hold a slightly stricter line so the
// form never accepts input the API would then reject.
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) return "Re-enter your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return undefined;
}

export function validateRegisterForm(fields: RegisterFields): RegisterErrors {
  const errors: RegisterErrors = {};
  const email = validateEmail(fields.email);
  const password = validatePassword(fields.password);
  const confirmPassword = validateConfirmPassword(fields.password, fields.confirmPassword);
  if (email) errors.email = email;
  if (password) errors.password = password;
  if (confirmPassword) errors.confirmPassword = confirmPassword;
  return errors;
}

export function hasErrors(errors: RegisterErrors): boolean {
  return Object.keys(errors).length > 0;
}
