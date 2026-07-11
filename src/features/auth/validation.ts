// Checks the sign up form on the device before anything is sent to Firebase.
// It uses no React and no Firebase, which makes it easy to test on its own and
// to reuse on the login form too.

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

// A simple check for the shape of an email. Firebase does the real check later;
// this just catches obvious typos before a request goes over the network.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Firebase needs at least 6 characters. The form asks for 8 so it never accepts a
// password that Firebase would then turn away.
export const MIN_PASSWORD_LENGTH = 8;

// Returns an error message if the email is empty or clearly not an email.
export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

// Returns an error message if the password is missing or too short.
export function validatePassword(password: string): string | undefined {
  if (!password) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

// Returns an error message if the second password is empty or does not match.
export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) return "Re-enter your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return undefined;
}

// Runs all three sign up checks and gathers any error messages into one object.
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

// True if any field in the errors object has a message.
export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}

// Login form checks

export type LoginFields = {
  email: string;
  password: string;
};

export type LoginErrors = {
  email?: string;
  password?: string;
};

// Checks the login form. Login only needs a password to be typed in. The length
// rule is for sign up only, since an older account might have been made before
// that rule existed, so it is not re-applied here.
export function validateLoginForm(fields: LoginFields): LoginErrors {
  const errors: LoginErrors = {};
  const email = validateEmail(fields.email);
  if (email) errors.email = email;
  if (!fields.password) errors.password = "Enter your password.";
  return errors;
}
