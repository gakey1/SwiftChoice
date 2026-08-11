// Checks the sign up and login forms on the device, before anything is sent to
// Firebase. No React and no Firebase in here, which is what makes it testable on
// its own and reusable across both forms.

// What the sign up form collects.
export type RegisterFields = {
  email: string;
  password: string;
  confirmPassword: string;
};

// One optional message per sign up field. A field with no message is valid.
export type RegisterErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

// A rough shape check, not a real address check. Firebase does the real one;
// this catches obvious typos before a request goes over the network.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Firebase needs at least 6 characters. The form asks for 8, so it never accepts
// a password Firebase would then turn away.
export const MIN_PASSWORD_LENGTH = 8;

// Returns a message if the email is empty or clearly not an email.
export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

// Returns a message if the password is missing or too short.
export function validatePassword(password: string): string | undefined {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

// Returns a message if the second password is empty or does not match.
export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) return "Re-enter your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return undefined;
}

// Runs all three sign up checks and gathers the messages into one object, so the
// form can flag every bad field at once rather than one per attempt.
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

// True if any field in an errors object carries a message. Used by both forms to
// decide whether to submit.
export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}

// Login form checks

// What the login form collects.
export type LoginFields = {
  email: string;
  password: string;
};

// One optional message per login field.
export type LoginErrors = {
  email?: string;
  password?: string;
};

// Checks the login form. The password only has to be typed: the length rule is
// registration-only, since an older account may predate it and re-applying it
// here would lock out a valid password.
export function validateLoginForm(fields: LoginFields): LoginErrors {
  const errors: LoginErrors = {};
  const email = validateEmail(fields.email);
  if (email) errors.email = email;
  if (!fields.password) errors.password = "Enter your password.";
  return errors;
}
